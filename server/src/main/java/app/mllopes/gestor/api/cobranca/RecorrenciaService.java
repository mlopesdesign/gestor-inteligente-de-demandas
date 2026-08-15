package app.mllopes.gestor.api.cobranca;

import app.mllopes.gestor.api.core.RecorrenciaCore;
import app.mllopes.gestor.api.core.RecorrenciaCore.Proxima;
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
 * Serviço de recorrências: após uma tarefa ser marcada como CONCLUIDA,
 * agenda a próxima ocorrência usando {@link RecorrenciaCore}.
 *
 * <p>Idempotente: confere em {@code recorrencias_ocorrencias} se a tarefa
 * pai já gerou a próxima. Se já, não duplica.
 */
public final class RecorrenciaService {

    private static final Logger LOG = LoggerFactory.getLogger(RecorrenciaService.class);

    private final Db db;
    private final ScheduledExecutorService scheduler;
    private final int intervaloMinutos;

    public RecorrenciaService(Db db, int intervaloMinutos) {
        this.db = db;
        this.intervaloMinutos = Math.max(1, intervaloMinutos);
        this.scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "recorrencia-motor");
            t.setDaemon(true);
            return t;
        });
    }

    public void iniciar() {
        long seg = TimeUnit.MINUTES.toSeconds(intervaloMinutos);
        scheduler.scheduleAtFixedRate(this::tick, 10, seg, TimeUnit.SECONDS);
        LOG.info("Motor de recorrência iniciado (intervalo={}min)", intervaloMinutos);
    }

    public void parar() {
        scheduler.shutdownNow();
    }

    /** Processa conclusões recentes (últimos N minutos) e gera próximas ocorrências. */
    public Resultado tick() {
        Instant agora = Instant.now();
        Resultado r = new Resultado();
        try (Connection c = db.conexao()) {
            // Busca tarefas concluídas com recorrencia_json e sem próxima ocorrência já gerada
            String sql = "SELECT t.id, t.usuario_id, t.titulo, t.descricao, t.area_id, t.projeto_id, t.cliente_id, " +
                         "t.prioridade, t.nivel_cobranca, t.duracao_estimada_min, t.recorrencia_json, t.vencimento_em, " +
                         "t.etiquetas_json, t.responsavel, t.concluida_em " +
                         "FROM tarefas t " +
                         "WHERE t.status = 'CONCLUIDA' " +
                         "AND t.recorrencia_json IS NOT NULL " +
                         "AND NOT EXISTS (SELECT 1 FROM recorrencias_ocorrencias r WHERE r.tarefa_pai_id = t.id) " +
                         "AND t.concluida_em > ?";
            try (PreparedStatement ps = c.prepareStatement(sql)) {
                ps.setString(1, agora.minusSeconds(TimeUnit.MINUTES.toSeconds(intervaloMinutos * 6)).toString());
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        Map<String, Object> pai = new LinkedHashMap<>();
                        pai.put("id", rs.getString("id"));
                        pai.put("usuario_id", rs.getString("usuario_id"));
                        pai.put("titulo", rs.getString("titulo"));
                        pai.put("descricao", rs.getString("descricao"));
                        pai.put("area_id", rs.getString("area_id"));
                        pai.put("projeto_id", rs.getString("projeto_id"));
                        pai.put("cliente_id", rs.getString("cliente_id"));
                        pai.put("prioridade", rs.getString("prioridade"));
                        pai.put("nivel_cobranca", rs.getString("nivel_cobranca"));
                        pai.put("duracao_estimada_min", rs.getObject("duracao_estimada_min"));
                        pai.put("recorrencia_json", rs.getString("recorrencia_json"));
                        pai.put("vencimento_em", rs.getString("vencimento_em"));
                        pai.put("etiquetas_json", rs.getString("etiquetas_json"));
                        pai.put("responsavel", rs.getString("responsavel"));

                        String uid = rs.getString("usuario_id");
                        ZoneId fuso = fusoUsuario(c, uid);
                        Proxima p = RecorrenciaCore.calcular(
                            rs.getString("recorrencia_json"),
                            readInstant(rs, "vencimento_em"),
                            agora, fuso, 2);
                        if (p.gerar()) {
                            String novoId = criarProximaTarefa(c, pai, p);
                            if (novoId != null) {
                                registrarOcorrencia(c, pai.get("id").toString(), novoId,
                                    p.novoVencimentoEm() == null ? "" : p.novoVencimentoEm().toString());
                                r.geradas++;
                            }
                        } else {
                            // Marca como encerrada (sem criar próxima)
                            try (PreparedStatement done = c.prepareStatement(
                                    "INSERT OR REPLACE INTO recorrencias_ocorrencias(tarefa_pai_id, tarefa_filho_id, data_referencia) VALUES (?, ?, ?)")) {
                                done.setString(1, pai.get("id").toString());
                                done.setString(2, pai.get("id").toString()); // auto-ref p/ indicar encerrada
                                done.setString(3, agora.toString());
                                done.executeUpdate();
                            }
                            r.encerradas++;
                            LOG.info("Recorrência encerrada para tarefa {}: {}", pai.get("id"), p.motivo());
                        }
                    }
                }
            }
        } catch (SQLException e) {
            LOG.error("Falha no tick de recorrência", e);
            r.erros++;
        }
        if (r.geradas > 0 || r.encerradas > 0 || r.erros > 0) {
            LOG.info("Recorrência tick: geradas={} encerradas={} erros={}", r.geradas, r.encerradas, r.erros);
        }
        return r;
    }

    private String criarProximaTarefa(Connection c, Map<String, Object> pai, Proxima p) throws SQLException {
        String novoId = UlidGen.novo();
        Instant agora = Instant.now();
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO tarefas(id, usuario_id, dono_id, titulo, descricao, area_id, projeto_id, cliente_id, " +
                "status, prioridade, nivel_cobranca, vencimento_em, duracao_estimada_min, " +
                "recorrencia_json, etiquetas_json, responsavel, origem, criado_em, atualizado_em, versao) " +
                "VALUES (?,?,?,?,?,?,?,?,'CAIXA_ENTRADA',?,?,?,?,?,?,?,'MANUAL',?,?,1)")) {
            int idx = 1;
            ps.setString(idx++, novoId);
            ps.setString(idx++, (String) pai.get("usuario_id"));
            ps.setString(idx++, (String) pai.get("usuario_id"));
            ps.setString(idx++, p.titulo() != null ? p.titulo() : (String) pai.get("titulo"));
            ps.setString(idx++, (String) pai.get("descricao"));
            ps.setString(idx++, (String) pai.get("area_id"));
            ps.setString(idx++, (String) pai.get("projeto_id"));
            ps.setString(idx++, (String) pai.get("cliente_id"));
            ps.setString(idx++, (String) pai.get("prioridade"));
            ps.setString(idx++, (String) pai.get("nivel_cobranca"));
            ps.setString(idx++, p.novoVencimentoEm() == null ? null : p.novoVencimentoEm().toString());
            if (pai.get("duracao_estimada_min") != null) {
                ps.setInt(idx++, ((Number) pai.get("duracao_estimada_min")).intValue());
            } else {
                ps.setNull(idx++, java.sql.Types.INTEGER);
            }
            ps.setString(idx++, (String) pai.get("recorrencia_json"));
            ps.setString(idx++, pai.get("etiquetas_json") == null ? "[]" : pai.get("etiquetas_json").toString());
            ps.setString(idx++, (String) pai.get("responsavel"));
            ps.setString(idx++, agora.toString());
            ps.setString(idx++, agora.toString());
            ps.executeUpdate();
            return novoId;
        } catch (SQLException e) {
            LOG.error("Falha ao criar próxima tarefa (pai={})", pai.get("id"), e);
            return null;
        }
    }

    private void registrarOcorrencia(Connection c, String paiId, String filhoId, String dataRef) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO recorrencias_ocorrencias(tarefa_pai_id, tarefa_filho_id, data_referencia) VALUES (?, ?, ?)")) {
            ps.setString(1, paiId);
            ps.setString(2, filhoId);
            ps.setString(3, dataRef);
            ps.executeUpdate();
        }
    }

    private ZoneId fusoUsuario(Connection c, String uid) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("SELECT fuso FROM usuarios WHERE id = ?")) {
            ps.setString(1, uid);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next() && rs.getString("fuso") != null) {
                    try { return ZoneId.of(rs.getString("fuso")); } catch (Exception ignored) {}
                }
            }
        }
        return ZoneId.of("America/Sao_Paulo");
    }

    private static Instant readInstant(ResultSet rs, String col) {
        try {
            String s = rs.getString(col);
            return (s == null || s.isBlank()) ? null : Instant.parse(s);
        } catch (Exception e) { return null; }
    }

    public static final class Resultado {
        public int geradas = 0;
        public int encerradas = 0;
        public int erros = 0;
        public Map<String, Object> toMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("proximas_geradas", geradas);
            m.put("recorrencias_encerradas", encerradas);
            m.put("erros", erros);
            return m;
        }
    }
}
