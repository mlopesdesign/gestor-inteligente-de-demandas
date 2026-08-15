package app.mllopes.gestor.api.routes;

import app.mllopes.gestor.api.auth.SessionService;
import app.mllopes.gestor.api.cobranca.CobrancaService;
import app.mllopes.gestor.api.core.CobrancaCore;
import app.mllopes.gestor.api.core.CobrancaCore.CobrancaDecisao;
import app.mllopes.gestor.api.db.Db;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import org.jetbrains.annotations.NotNull;
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

/**
 * Rotas de cobrança: estado por tarefa, pendentes do usuário, config
 * do usuário, tick manual (debug).
 */
public final class CobrancaRoutes {

    private static final Logger LOG = LoggerFactory.getLogger(CobrancaRoutes.class);

    private final Db db;
    private final SessionService session;
    private final CobrancaService service;

    public CobrancaRoutes(Db db, SessionService session, CobrancaService service) {
        this.db = db; this.session = session; this.service = service;
    }

    public void register(io.javalin.Javalin app) {
        app.get("/api/v1/cobranca/pendentes", this::pendentes);
        app.get("/api/v1/cobranca/config", this::config);
        app.put("/api/v1/cobranca/config", this::atualizarConfig);
        app.get("/api/v1/tarefas/{id}/cobranca", this::estadoTarefa);
        app.post("/api/v1/cobranca/tick", this::tick); // debug
    }

    private void tick(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        CobrancaService.Resultado r = service.tick();
        ctx.json(Map.of("ok", true, "dados", r.toMap()));
    }

    private void pendentes(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        Instant agora = Instant.now();
        try (Connection c = db.conexao()) {
            String sql = "SELECT id, status, prioridade, nivel_cobranca, vencimento_em " +
                         "FROM tarefas WHERE usuario_id = ? AND status NOT IN ('CONCLUIDA','CANCELADA','ARQUIVADA') " +
                         "ORDER BY (vencimento_em IS NULL), vencimento_em ASC LIMIT 100";
            List<Map<String, Object>> out = new ArrayList<>();
            try (PreparedStatement ps = c.prepareStatement(sql)) {
                ps.setString(1, s.usuarioId());
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("id", rs.getString("id"));
                        item.put("status", rs.getString("status"));
                        item.put("prioridade", rs.getString("prioridade"));
                        item.put("nivel_cobranca", rs.getString("nivel_cobranca"));
                        String v = rs.getString("vencimento_em");
                        item.put("vencimento_em", v);
                        if (v != null) {
                            Instant venc = Instant.parse(v);
                            long hAtraso = Math.max(0, java.time.Duration.between(venc, agora).toHours());
                            item.put("horas_atraso", hAtraso);
                            String nivel = rs.getString("nivel_cobranca");
                            item.put("proxima_cobranca_em_segundos", CobrancaCore.intervaloSegundos(nivel));
                            item.put("horas_ate_bloqueio", CobrancaCore.horasAteBloqueio(rs.getString("prioridade")));
                        }
                        out.add(item);
                    }
                }
            }
            ctx.json(Map.of("ok", true, "dados", out));
        } catch (SQLException e) {
            LOG.error("Falha ao listar pendentes", e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "INTERNO", "mensagem", e.getMessage())));
        }
    }

    private void config(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        try (Connection c = db.conexao()) {
            boolean silenciar = true;
            String politicas = "{}";
            try (PreparedStatement ps = c.prepareStatement(
                    "SELECT silenciar_fora_horario, politicas_json FROM cobranca_config WHERE usuario_id = ?")) {
                ps.setString(1, s.usuarioId());
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        silenciar = rs.getInt("silenciar_fora_horario") != 0;
                        politicas = rs.getString("politicas_json");
                    }
                }
            }
            int horaInicio = 8, horaFim = 18;
            try (PreparedStatement ps = c.prepareStatement(
                    "SELECT horario_trab_inicio, horario_trab_fim FROM usuarios WHERE id = ?")) {
                ps.setString(1, s.usuarioId());
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        horaInicio = parseHora(rs.getString("horario_trab_inicio"), 8);
                        horaFim = parseHora(rs.getString("horario_trab_fim"), 18);
                    }
                }
            }
            Map<String, Object> dados = new LinkedHashMap<>();
            dados.put("silenciar_fora_horario", silenciar);
            dados.put("politicas", politicas);
            dados.put("horario_inicio", horaInicio);
            dados.put("horario_fim", horaFim);
            ctx.json(Map.of("ok", true, "dados", dados));
        } catch (SQLException e) {
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "INTERNO", "mensagem", e.getMessage())));
        }
    }

    private void atualizarConfig(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        try {
            Map<?, ?> body = ctx.bodyAsClass(Map.class);
            Boolean silenciar = body.get("silenciar_fora_horario") == null ? null
                : ((Number) body.get("silenciar_fora_horario")).intValue() != 0;
            String politicas = body.get("politicas") == null ? "{}" : body.get("politicas").toString();
            try (Connection c = db.conexao();
                 PreparedStatement ps = c.prepareStatement(
                    "INSERT INTO cobranca_config(usuario_id, silenciar_fora_horario, politicas_json, versao) " +
                    "VALUES (?,?,?,1) " +
                    "ON CONFLICT(usuario_id) DO UPDATE SET " +
                    "silenciar_fora_horario = excluded.silenciar_fora_horario, " +
                    "politicas_json = excluded.politicas_json, " +
                    "versao = versao + 1")) {
                ps.setString(1, s.usuarioId());
                if (silenciar != null) ps.setInt(2, silenciar ? 1 : 0);
                else ps.setInt(2, 1);
                ps.setString(3, politicas);
                ps.executeUpdate();
            }
            ctx.json(Map.of("ok", true, "dados", Map.of("atualizado", true)));
        } catch (Exception e) {
            LOG.error("Falha ao atualizar config", e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "INTERNO", "mensagem", e.getMessage())));
        }
    }

    private void estadoTarefa(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        try (Connection c = db.conexao()) {
            String id = ctx.pathParam("id");
            Instant venc = null, ultimaCob = null, atualizadoEm = null;
            String status = null, prio = null, nivel = null;
            try (PreparedStatement ps = c.prepareStatement(
                    "SELECT status, prioridade, nivel_cobranca, vencimento_em, atualizado_em " +
                    "FROM tarefas WHERE id = ? AND usuario_id = ?")) {
                ps.setString(1, id);
                ps.setString(2, s.usuarioId());
                try (ResultSet rs = ps.executeQuery()) {
                    if (!rs.next()) {
                        ctx.status(HttpStatus.NOT_FOUND);
                        ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "NAO_ENCONTRADO", "mensagem", "Tarefa não encontrada.")));
                        return;
                    }
                    status = rs.getString("status");
                    prio = rs.getString("prioridade");
                    nivel = rs.getString("nivel_cobranca");
                    String v = rs.getString("vencimento_em");
                    venc = (v == null || v.isBlank()) ? null : Instant.parse(v);
                    String a = rs.getString("atualizado_em");
                    atualizadoEm = (a == null || a.isBlank()) ? null : Instant.parse(a);
                }
            }
            // Última cobrança real
            try (PreparedStatement ps = c.prepareStatement(
                    "SELECT criado_em FROM lembretes WHERE tarefa_id = ? AND canal = 'WINDOWS_LOCAL' ORDER BY criado_em DESC LIMIT 1")) {
                ps.setString(1, id);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        String c2 = rs.getString("criado_em");
                        ultimaCob = (c2 == null || c2.isBlank()) ? null : Instant.parse(c2);
                    }
                }
            }

            boolean silenciar = true;
            int horaInicio = 8, horaFim = 18;
            ZoneId fuso = ZoneId.of("America/Sao_Paulo");
            try (PreparedStatement ps = c.prepareStatement(
                    "SELECT cc.silenciar_fora_horario, u.horario_trab_inicio, u.horario_trab_fim, u.fuso " +
                    "FROM usuarios u LEFT JOIN cobranca_config cc ON cc.usuario_id = u.id " +
                    "WHERE u.id = ?")) {
                ps.setString(1, s.usuarioId());
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        silenciar = rs.getInt("silenciar_fora_horario") != 0;
                        horaInicio = parseHora(rs.getString("horario_trab_inicio"), 8);
                        horaFim = parseHora(rs.getString("horario_trab_fim"), 18);
                        try { fuso = ZoneId.of(rs.getString("fuso")); } catch (Exception ignored) {}
                    }
                }
            }

            CobrancaDecisao d = CobrancaCore.avaliar(
                status, prio, nivel, venc, ultimaCob, Instant.now(),
                fuso, horaInicio, horaFim, silenciar);

            Map<String, Object> dados = new LinkedHashMap<>();
            dados.put("id", id);
            dados.put("status", status);
            dados.put("prioridade", prio);
            dados.put("nivel_cobranca", nivel);
            dados.put("decisao", Map.of(
                "notificar", d.notificar(),
                "proxima_em_segundos", d.proximaCobrancaEmSegundos(),
                "nivel_aplicado", d.nivelAplicado(),
                "prioridade_aplicada", d.prioridadeAplicada(),
                "bloquear", d.bloquear(),
                "motivo", d.motivo()
            ));
            if (venc != null) {
                long hAtraso = Math.max(0, java.time.Duration.between(venc, Instant.now()).toHours());
                dados.put("horas_atraso", hAtraso);
            }
            ctx.json(Map.of("ok", true, "dados", dados));
        } catch (Exception e) {
            LOG.error("Falha em estadoTarefa", e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "INTERNO", "mensagem", e.getMessage())));
        }
    }

    private SessionService.Sessao requireSession(Context ctx) {
        String token = ctx.cookie(SessionService.COOKIE);
        SessionService.Sessao s = token == null ? null : session.buscar(token);
        if (s == null) {
            ctx.status(HttpStatus.UNAUTHORIZED);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "NAO_AUTENTICADO", "mensagem", "Login necessário.")));
        }
        return s;
    }

    private static int parseHora(String s, int def) {
        if (s == null) return def;
        try { return Integer.parseInt(s.split(":")[0]); } catch (Exception e) { return def; }
    }
}
