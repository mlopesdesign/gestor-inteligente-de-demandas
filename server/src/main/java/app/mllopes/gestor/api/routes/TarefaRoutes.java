package app.mllopes.gestor.api.routes;

import app.mllopes.gestor.api.auth.SessionService;
import app.mllopes.gestor.api.core.UlidGen;
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
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Rotas /api/v1/tarefas/* — CRUD + ações (concluir, cancelar, reabrir, adiar, entregar).
 * Conforme docs/03-CONTRATOS-API.md e docs/04-POLITICA-SYNC.md.
 */
public final class TarefaRoutes {

    private static final Logger LOG = LoggerFactory.getLogger(TarefaRoutes.class);

    private final Db db;
    private final SessionService session;

    public TarefaRoutes(Db db, SessionService session) {
        this.db = db; this.session = session;
    }

    public void register(io.javalin.Javalin app) {
        app.get("/api/v1/tarefas", this::listar);
        app.post("/api/v1/tarefas", this::criar);
        app.get("/api/v1/tarefas/{id}", this::buscar);
        app.patch("/api/v1/tarefas/{id}", this::atualizar);
        app.post("/api/v1/tarefas/{id}/concluir", this::concluir);
        app.post("/api/v1/tarefas/{id}/reabrir", this::reabrir);
        app.post("/api/v1/tarefas/{id}/cancelar", this::cancelar);
        app.post("/api/v1/tarefas/{id}/adiar", this::adiar);
    }

    private void listar(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        String status = ctx.queryParam("status");
        StringBuilder sql = new StringBuilder("SELECT * FROM tarefas WHERE usuario_id = ?");
        if (status != null) sql.append(" AND status = ?");
        sql.append(" ORDER BY atualizado_em DESC LIMIT 200");
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(sql.toString())) {
            ps.setString(1, s.usuarioId());
            if (status != null) ps.setString(2, status);
            try (ResultSet rs = ps.executeQuery()) {
                java.util.List<Map<String, Object>> list = new java.util.ArrayList<>();
                while (rs.next()) list.add(rowToMap(rs));
                ctx.json(Map.of("ok", true, "dados", list));
            }
        } catch (SQLException e) {
            LOG.error("Falha ao listar tarefas", e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "INTERNO", "mensagem", e.getMessage())));
        }
    }

    private void buscar(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement("SELECT * FROM tarefas WHERE id = ? AND usuario_id = ?")) {
            ps.setString(1, ctx.pathParam("id"));
            ps.setString(2, s.usuarioId());
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    ctx.status(HttpStatus.NOT_FOUND);
                    ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "NAO_ENCONTRADO", "mensagem", "Tarefa não encontrada.")));
                    return;
                }
                ctx.json(Map.of("ok", true, "dados", rowToMap(rs)));
            }
        } catch (SQLException e) {
            LOG.error("Falha ao buscar tarefa", e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "INTERNO", "mensagem", e.getMessage())));
        }
    }

    private void criar(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        Map<?, ?> body = null;
        try {
            body = ctx.bodyAsClass(Map.class);
            String id = UlidGen.novo();
            String agora = Instant.now().toString();
            String titulo = str(body, "titulo");
            if (titulo == null || titulo.isBlank()) {
                ctx.status(HttpStatus.BAD_REQUEST);
                ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "VALIDACAO", "mensagem", "titulo obrigatório")));
                return;
            }
            String status = strOr(body, "status", "CAIXA_ENTRADA");
            String prioridade = strOr(body, "prioridade", "NORMAL");
            String nivelCobranca = strOr(body, "nivel_cobranca", "PERSISTENTE");
            String origem = strOr(body, "origem", "MANUAL");
            try (Connection c = db.conexao();
                 PreparedStatement ps = c.prepareStatement(
                    "INSERT INTO tarefas(id, usuario_id, dono_id, titulo, descricao, area_id, projeto_id, cliente_id, " +
                    "status, prioridade, nivel_cobranca, inicio_em, vencimento_em, duracao_estimada_min, " +
                    "duracao_realizada_min, recorrencia_json, etiquetas_json, responsavel, origem, " +
                    "criado_em, atualizado_em, versao) " +
                    "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")) {
                int p = 1;
                ps.setString(p++, id);
                ps.setString(p++, s.usuarioId());
                ps.setString(p++, s.usuarioId());
                ps.setString(p++, titulo);
                ps.setString(p++, str(body, "descricao"));
                ps.setString(p++, str(body, "area_id"));
                ps.setString(p++, str(body, "projeto_id"));
                ps.setString(p++, str(body, "cliente_id"));
                ps.setString(p++, status);
                ps.setString(p++, prioridade);
                ps.setString(p++, nivelCobranca);
                ps.setString(p++, str(body, "inicio_em"));
                ps.setString(p++, str(body, "vencimento_em"));
                Object durEstimada = body.get("duracao_estimada_min");
                if (durEstimada instanceof Number n) ps.setInt(p++, n.intValue());
                else if (durEstimada != null) ps.setInt(p++, Integer.parseInt(durEstimada.toString()));
                else ps.setNull(p++, java.sql.Types.INTEGER);
                ps.setInt(p++, intOrZero(body, "duracao_realizada_min"));
                ps.setString(p++, str(body, "recorrencia_json"));
                ps.setString(p++, strOr(body, "etiquetas_json", "[]"));
                ps.setString(p++, str(body, "responsavel"));
                ps.setString(p++, origem);
                ps.setString(p++, agora);
                ps.setString(p++, agora);
                ps.setInt(p++, 1);
                LOG.info("criar: usando {} binds (de 22)", p - 1);
                ps.executeUpdate();
            }
            ctx.status(HttpStatus.CREATED);
            ctx.json(Map.of("ok", true, "dados", Map.of("id", id, "versao", 1, "criado_em", agora)));
        } catch (SQLException e) {
            LOG.error("Falha ao criar tarefa. body keys={}", body != null ? body.keySet() : "null");
            LOG.error("Falha ao criar tarefa", e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "INTERNO", "mensagem", e.getMessage())));
        } catch (Exception e) {
            LOG.error("Falha inesperada ao criar tarefa. body keys={}", body != null ? body.keySet() : "null", e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "INTERNO", "mensagem", e.getClass().getSimpleName() + ": " + e.getMessage())));
        }
    }

    private void atualizar(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        try {
            Map<?, ?> body = ctx.bodyAsClass(Map.class);
            int versao = intOrZero(body, "versao");
            if (versao <= 0) {
                ctx.status(HttpStatus.BAD_REQUEST);
                ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "VALIDACAO", "mensagem", "Campo 'versao' é obrigatório.")));
                return;
            }
            String id = ctx.pathParam("id");
            // Constrói SET dinâmico
            StringBuilder sql = new StringBuilder("UPDATE tarefas SET atualizado_em = ?, versao = versao + 1");
            java.util.List<Object> vals = new java.util.ArrayList<>();
            vals.add(Instant.now().toString());
            String[] campos = {"titulo","descricao","area_id","projeto_id","cliente_id","status","prioridade","nivel_cobranca","inicio_em","vencimento_em","duracao_estimada_min","duracao_realizada_min","recorrencia_json","etiquetas_json","responsavel"};
            for (String c : campos) {
                if (body.containsKey(c)) {
                    sql.append(", ").append(c).append(" = ?");
                    vals.add(body.get(c));
                }
            }
            sql.append(" WHERE id = ? AND usuario_id = ? AND versao = ?");
            vals.add(id); vals.add(s.usuarioId()); vals.add(versao);
            try (Connection c = db.conexao();
                 PreparedStatement ps = c.prepareStatement(sql.toString())) {
                for (int i = 0; i < vals.size(); i++) ps.setObject(i + 1, vals.get(i));
                int n = ps.executeUpdate();
                if (n == 0) {
                    ctx.status(HttpStatus.CONFLICT);
                    ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "CONFLITO_VERSAO", "mensagem", "Versão desatualizada.")));
                    return;
                }
            }
            // Retorna o estado atual
            try (Connection c = db.conexao();
                 PreparedStatement ps = c.prepareStatement("SELECT * FROM tarefas WHERE id = ? AND usuario_id = ?")) {
                ps.setString(1, id);
                ps.setString(2, s.usuarioId());
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) ctx.json(Map.of("ok", true, "dados", rowToMap(rs)));
                }
            }
        } catch (SQLException e) {
            LOG.error("Falha ao atualizar tarefa", e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "INTERNO", "mensagem", e.getMessage())));
        }
    }

    private void concluir(@NotNull Context ctx) {
        alterarStatus(ctx, "CONCLUIDA", null, null, "concluida_em");
    }
    private void reabrir(@NotNull Context ctx) {
        Map<?, ?> body = parseBodySafe(ctx);
        String motivo = str(body, "motivo");
        if (motivo == null || motivo.isBlank()) {
            ctx.status(HttpStatus.BAD_REQUEST);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "REQUISICAO_INVALIDA", "mensagem", "Reabrir exige motivo.")));
            return;
        }
        alterarStatus(ctx, "EM_ANDAMENTO", motivo, "concluida_em", null);
    }
    private void cancelar(@NotNull Context ctx) {
        Map<?, ?> body = parseBodySafe(ctx);
        String motivo = str(body, "motivo");
        if (motivo == null || motivo.isBlank()) {
            ctx.status(HttpStatus.BAD_REQUEST);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "REQUISICAO_INVALIDA", "mensagem", "Cancelar exige motivo.")));
            return;
        }
        alterarStatus(ctx, "CANCELADA", motivo, "motivo_cancelamento", "concluida_em");
    }
    private void adiar(@NotNull Context ctx) {
        Map<?, ?> body = parseBodySafe(ctx);
        String novoVencimento = str(body, "vencimento_em");
        if (novoVencimento == null) {
            ctx.status(HttpStatus.BAD_REQUEST);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "VALIDACAO", "mensagem", "vencimento_em é obrigatório.")));
            return;
        }
        // Se tarefa está vencida, motivo é obrigatório
        try (Connection c = db.conexao();
             PreparedStatement sel = c.prepareStatement("SELECT vencimento_em FROM tarefas WHERE id = ? AND usuario_id = ?")) {
            sel.setString(1, ctx.pathParam("id"));
            sel.setString(2, sessao(ctx).usuarioId());
            try (ResultSet rs = sel.executeQuery()) {
                if (rs.next()) {
                    String v = rs.getString("vencimento_em");
                    if (v != null && Instant.parse(v).isBefore(Instant.now())) {
                        String motivo = str(body, "motivo");
                        if (motivo == null || motivo.isBlank()) {
                            ctx.status(HttpStatus.BAD_REQUEST);
                            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "REQUISICAO_INVALIDA", "mensagem", "Tarefa vencida: adiamento exige motivo.")));
                            return;
                        }
                        // Grava motivo
                        try (PreparedStatement up = c.prepareStatement(
                            "UPDATE tarefas SET vencimento_em = ?, motivo_adiamento = ?, atualizado_em = ?, versao = versao + 1 WHERE id = ? AND usuario_id = ?")) {
                            up.setString(1, novoVencimento);
                            up.setString(2, motivo);
                            up.setString(3, Instant.now().toString());
                            up.setString(4, ctx.pathParam("id"));
                            up.setString(5, sessao(ctx).usuarioId());
                            up.executeUpdate();
                        }
                    } else {
                        try (PreparedStatement up = c.prepareStatement(
                            "UPDATE tarefas SET vencimento_em = ?, status = 'ADIADA', atualizado_em = ?, versao = versao + 1 WHERE id = ? AND usuario_id = ?")) {
                            up.setString(1, novoVencimento);
                            up.setString(2, Instant.now().toString());
                            up.setString(3, ctx.pathParam("id"));
                            up.setString(4, sessao(ctx).usuarioId());
                            up.executeUpdate();
                        }
                    }
                }
            }
        } catch (SQLException e) {
            LOG.error("Falha ao adiar", e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "INTERNO", "mensagem", e.getMessage())));
            return;
        }
        ctx.json(Map.of("ok", true, "dados", Map.of("mensagem", "Tarefa adiada.")));
    }

    private void alterarStatus(Context ctx, String novoStatus, String motivo, String campoMotivo, String campoHora) {
        var s = sessao(ctx); if (s == null) return;
        try (Connection c = db.conexao()) {
            StringBuilder sql = new StringBuilder("UPDATE tarefas SET status = ?, atualizado_em = ?, versao = versao + 1");
            java.util.List<Object> vals = new java.util.ArrayList<>();
            vals.add(novoStatus);
            vals.add(Instant.now().toString());
            if (motivo != null && campoMotivo != null) {
                sql.append(", ").append(campoMotivo).append(" = ?");
                vals.add(motivo);
            }
            if (campoHora != null) {
                sql.append(", ").append(campoHora).append(" = ?");
                vals.add(Instant.now().toString());
            }
            sql.append(" WHERE id = ? AND usuario_id = ?");
            vals.add(ctx.pathParam("id"));
            vals.add(s.usuarioId());
            try (PreparedStatement ps = c.prepareStatement(sql.toString())) {
                for (int i = 0; i < vals.size(); i++) ps.setObject(i + 1, vals.get(i));
                int n = ps.executeUpdate();
                if (n == 0) {
                    ctx.status(HttpStatus.NOT_FOUND);
                    ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "NAO_ENCONTRADO", "mensagem", "Tarefa não encontrada.")));
                    return;
                }
            }
            // Registra auditoria
            try (PreparedStatement aud = c.prepareStatement(
                "INSERT INTO auditoria(id, usuario_id, entidade, entidade_id, acao, diff_json, em) VALUES (?,?,?,?,?,?,?)")) {
                aud.setString(1, UlidGen.novo());
                aud.setString(2, s.usuarioId());
                aud.setString(3, "tarefas");
                aud.setString(4, ctx.pathParam("id"));
                aud.setString(5, "status_alterado:" + novoStatus);
                aud.setString(6, motivo == null ? null : ("{\"novo_status\":\"" + novoStatus + "\",\"motivo\":\"" + motivo.replace("\"", "\\\"") + "\"}"));
                aud.setString(7, Instant.now().toString());
                aud.executeUpdate();
            }
            ctx.json(Map.of("ok", true, "dados", Map.of("novo_status", novoStatus)));
        } catch (SQLException e) {
            LOG.error("Falha ao mudar status", e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "INTERNO", "mensagem", e.getMessage())));
        }
    }

    private SessionService.Sessao sessao(Context ctx) { return requireSession(ctx); }

    private SessionService.Sessao requireSession(Context ctx) {
        String token = ctx.cookie(SessionService.COOKIE);
        SessionService.Sessao s = token == null ? null : session.buscar(token);
        if (s == null) {
            ctx.status(HttpStatus.UNAUTHORIZED);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "NAO_AUTENTICADO", "mensagem", "Login necessário.")));
        }
        return s;
    }

    private static Map<?, ?> parseBodySafe(Context ctx) {
        try { return ctx.bodyAsClass(Map.class); } catch (Exception e) { return Map.of(); }
    }

    private static String str(Map<?, ?> body, String key) {
        Object v = body == null ? null : body.get(key);
        return v == null ? null : v.toString();
    }
    private static String strOr(Map<?, ?> body, String key, String def) {
        String s = str(body, key);
        return s == null ? def : s;
    }
    private static int intOrZero(Map<?, ?> body, String key) {
        Object v = body == null ? null : body.get(key);
        if (v == null) return 0;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(v.toString()); } catch (Exception e) { return 0; }
    }
    private static int intOrMinusOne(Map<?, ?> body, String key) {
        Object v = body == null ? null : body.get(key);
        if (v == null) return -1;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(v.toString()); } catch (Exception e) { return -1; }
    }

    private static Map<String, Object> rowToMap(ResultSet rs) throws SQLException {
        Map<String, Object> m = new LinkedHashMap<>();
        var md = rs.getMetaData();
        int n = md.getColumnCount();
        for (int i = 1; i <= n; i++) m.put(md.getColumnLabel(i).toLowerCase(), rs.getObject(i));
        return m;
    }
}
