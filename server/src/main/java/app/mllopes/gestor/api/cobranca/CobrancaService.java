package app.mllopes.gestor.api.cobranca;

import app.mllopes.gestor.api.core.CobrancaCore;
import app.mllopes.gestor.api.core.CobrancaCore.CobrancaDecisao;
import app.mllopes.gestor.api.core.UlidGen;
import app.mllopes.gestor.api.db.Db;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Serviço de cobrança contínua: executa o motor periodicamente e aplica
 * as decisões ao banco (escala prioridade, marca bloqueio, enfileira
 * notificações em {@code lembretes}).
 *
 * <p>Conforme docs/06-ESTRATÉGIA-NOTIFICAÇÕES.md §"Cobrança contínua" e
 * ADR 0005. Idempotente: rodar duas vezes no mesmo minuto não duplica
 * notificações porque checa o último {@code lembretes.criado_em} por tarefa.
 */
public final class CobrancaService {

    private static final Logger LOG = LoggerFactory.getLogger(CobrancaService.class);

    private final Db db;
    private final ScheduledExecutorService scheduler;
    private final int intervaloMinutos;

    public CobrancaService(Db db, int intervaloMinutos) {
        this.db = db;
        this.intervaloMinutos = Math.max(1, intervaloMinutos);
        this.scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "cobranca-motor");
            t.setDaemon(true);
            return t;
        });
    }

    public void iniciar() {
        long seg = TimeUnit.MINUTES.toSeconds(intervaloMinutos);
        scheduler.scheduleAtFixedRate(this::tick, 5, seg, TimeUnit.SECONDS);
        LOG.info("Motor de cobrança iniciado (intervalo={}min)", intervaloMinutos);
    }

    public void parar() {
        scheduler.shutdownNow();
    }

    /** Tick único: avalia todas as tarefas vencidas e aplica decisões. */
    public Resultado tick() {
        Instant agora = Instant.now();
        Resultado r = new Resultado();
        try (Connection c = db.conexao()) {
            // Para cada usuário, carrega config e processa tarefas não resolvidas
            List<String> usuarios = listarUsuarios(c);
            for (String uid : usuarios) {
                processarUsuario(c, uid, agora, r);
            }
        } catch (SQLException e) {
            LOG.error("Falha no tick de cobrança", e);
            r.erros++;
        }
        if (r.geradas > 0 || r.bloqueadas > 0 || r.erros > 0) {
            LOG.info("Cobrança tick: geradas={} bloqueadas={} escaladas={} erros={}",
                r.geradas, r.bloqueadas, r.escaladas, r.erros);
        }
        return r;
    }

    private List<String> listarUsuarios(Connection c) throws SQLException {
        List<String> out = new ArrayList<>();
        try (PreparedStatement ps = c.prepareStatement("SELECT id, fuso FROM usuarios WHERE conta_apagada_em IS NULL")) {
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) out.add(rs.getString("id"));
            }
        }
        return out;
    }

    private void processarUsuario(Connection c, String usuarioId, Instant agora, Resultado r) throws SQLException {
        // Carrega config
        boolean silenciarForaHorario = true;
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT silenciar_fora_horario FROM cobranca_config WHERE usuario_id = ?")) {
            ps.setString(1, usuarioId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) silenciarForaHorario = rs.getInt("silenciar_fora_horario") != 0;
            }
        }
        // Carrega horário de trabalho
        int horaInicio = 8, horaFim = 18;
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT horario_trab_inicio, horario_trab_fim FROM usuarios WHERE id = ?")) {
            ps.setString(1, usuarioId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    horaInicio = parseHora(rs.getString("horario_trab_inicio"), 8);
                    horaFim = parseHora(rs.getString("horario_trab_fim"), 18);
                }
            }
        }
        ZoneId fuso = ZoneId.of("America/Sao_Paulo");
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT fuso FROM usuarios WHERE id = ?")) {
            ps.setString(1, usuarioId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next() && rs.getString("fuso") != null) {
                    try { fuso = ZoneId.of(rs.getString("fuso")); } catch (Exception ignored) {}
                }
            }
        }

        // Para cada tarefa ativa do usuário
        String sql = "SELECT id, status, prioridade, nivel_cobranca, vencimento_em, atualizado_em " +
                     "FROM tarefas WHERE usuario_id = ? AND status NOT IN ('CONCLUIDA','CANCELADA','ARQUIVADA')";
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, usuarioId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    String id = rs.getString("id");
                    String status = rs.getString("status");
                    String prio = rs.getString("prioridade");
                    String nivel = rs.getString("nivel_cobranca");
                    Instant venc = readInstant(rs, "vencimento_em");
                    Instant ultima = ultimaCobranca(c, id);
                    Instant ultimoAt = readInstant(rs, "atualizado_em");

                    CobrancaDecisao d = CobrancaCore.avaliar(
                        status, prio, nivel, venc, ultima, agora, fuso,
                        horaInicio, horaFim, silenciarForaHorario);

                    // Aplica escalonamentos
                    if (d.bloquear() && !"BLOQUEADA".equals(status)) {
                        aplicarStatus(c, id, "BLOQUEADA");
                        auditoria(c, usuarioId, id, "status_alterado:BLOQUEADA", "{\"motivo\":\"cobranca_critica\"}");
                        r.bloqueadas++;
                    }
                    if (!d.prioridadeAplicada().equals(prio)) {
                        aplicarPrioridade(c, id, d.prioridadeAplicada());
                        r.escaladas++;
                    }
                    if (!d.nivelAplicado().equals(nivel)) {
                        aplicarNivel(c, id, d.nivelAplicado());
                        r.escaladas++;
                    }
                    if (d.notificar()) {
                        enfileirarLembrete(c, usuarioId, id, d);
                        r.geradas++;
                    }
                }
            }
        }
    }

    private Instant ultimaCobranca(Connection c, String tarefaId) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT criado_em FROM lembretes WHERE tarefa_id = ? AND canal = 'WINDOWS_LOCAL' ORDER BY criado_em DESC LIMIT 1")) {
            ps.setString(1, tarefaId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) return readInstant(rs, "criado_em");
            }
        }
        return null;
    }

    private void enfileirarLembrete(Connection c, String usuarioId, String tarefaId, CobrancaDecisao d) throws SQLException {
        String id = UlidGen.novo();
        Instant agora = Instant.now();
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO lembretes(id, tarefa_id, usuario_id, dono_id, momento, canal, estado, tentativas, criado_em, versao) " +
                "VALUES (?,?,?,?,?,'WINDOWS_LOCAL','PENDENTE',0,?,1)")) {
            ps.setString(1, id);
            ps.setString(2, tarefaId);
            ps.setString(3, usuarioId);
            ps.setString(4, usuarioId);
            ps.setString(5, agora.toString());
            ps.setString(6, agora.toString());
            ps.executeUpdate();
        }
        auditoria(c, usuarioId, tarefaId, "lembrete_gerado", "{\"nivel\":\"" + d.nivelAplicado() + "\",\"motivo\":\"" + escape(d.motivo()) + "\"}");
    }

    private void aplicarStatus(Connection c, String id, String novo) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "UPDATE tarefas SET status = ?, atualizado_em = ?, versao = versao + 1 WHERE id = ?")) {
            ps.setString(1, novo);
            ps.setString(2, Instant.now().toString());
            ps.setString(3, id);
            ps.executeUpdate();
        }
    }
    private void aplicarPrioridade(Connection c, String id, String nova) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "UPDATE tarefas SET prioridade = ?, atualizado_em = ?, versao = versao + 1 WHERE id = ?")) {
            ps.setString(1, nova);
            ps.setString(2, Instant.now().toString());
            ps.setString(3, id);
            ps.executeUpdate();
        }
    }
    private void aplicarNivel(Connection c, String id, String novo) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "UPDATE tarefas SET nivel_cobranca = ?, atualizado_em = ?, versao = versao + 1 WHERE id = ?")) {
            ps.setString(1, novo);
            ps.setString(2, Instant.now().toString());
            ps.setString(3, id);
            ps.executeUpdate();
        }
    }

    private void auditoria(Connection c, String uid, String tarefaId, String acao, String diff) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO auditoria(id, usuario_id, entidade, entidade_id, acao, diff_json, em) VALUES (?,?,?,?,?,?,?)")) {
            ps.setString(1, UlidGen.novo());
            ps.setString(2, uid);
            ps.setString(3, "tarefas");
            ps.setString(4, tarefaId);
            ps.setString(5, acao);
            ps.setString(6, diff);
            ps.setString(7, Instant.now().toString());
            ps.executeUpdate();
        }
    }

    private static int parseHora(String s, int def) {
        if (s == null) return def;
        try {
            String[] p = s.split(":");
            return Integer.parseInt(p[0]);
        } catch (Exception e) { return def; }
    }

    private static Instant readInstant(ResultSet rs, String col) {
        try {
            String s = rs.getString(col);
            return (s == null || s.isBlank()) ? null : Instant.parse(s);
        } catch (Exception e) { return null; }
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    /** Resumo do tick para logs e telemetria. */
    public static final class Resultado {
        public int geradas = 0;
        public int bloqueadas = 0;
        public int escaladas = 0;
        public int erros = 0;
        public Map<String, Object> toMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("lembretes_gerados", geradas);
            m.put("tarefas_bloqueadas", bloqueadas);
            m.put("escalonamentos", escaladas);
            m.put("erros", erros);
            return m;
        }
    }
}
