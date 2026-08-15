package app.mllopes.gestor.api.routes;

import app.mllopes.gestor.api.ai.AiGateway;
import app.mllopes.gestor.api.ai.PromptRepository;
import app.mllopes.gestor.api.auth.SessionService;
import app.mllopes.gestor.api.core.UlidGen;
import app.mllopes.gestor.api.db.Db;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import org.jetbrains.annotations.NotNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Rotas de IA (Fase 6). Conforme ADR 0004.
 * <ul>
 *   <li>POST /api/v1/ai/parse-tarefa    - transforma texto livre em tarefa</li>
 *   <li>POST /api/v1/ai/sugerir-proximo - sugere próxima ação</li>
 *   <li>GET  /api/v1/ai/status          - status do gateway (disponível/fallback)</li>
 * </ul>
 */
public final class AiRoutes {

    private static final Logger LOG = LoggerFactory.getLogger(AiRoutes.class);
    private final Db db;
    private final SessionService session;
    private final AiGateway gateway;
    private final PromptRepository prompts;
    private final ObjectMapper mapper = new ObjectMapper();

    public AiRoutes(Db db, SessionService session, AiGateway gateway, PromptRepository prompts) {
        this.db = db; this.session = session; this.gateway = gateway; this.prompts = prompts;
    }

    public void register(io.javalin.Javalin app) {
        app.get("/api/v1/ai/status", this::status);
        app.post("/api/v1/ai/parse-tarefa", this::parseTarefa);
        app.post("/api/v1/ai/sugerir-proximo", this::sugerirProximo);
    }

    private void status(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        Map<String, Object> dados = new LinkedHashMap<>();
        dados.put("disponivel", gateway.disponivel());
        dados.put("modelo", gateway.modelo());
        dados.put("prompt_versao", PromptRepository.VERSAO_ATUAL);
        ctx.json(Map.of("ok", true, "dados", dados));
    }

    private void parseTarefa(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        String texto = null;
        try {
            Map<?, ?> body = ctx.bodyAsClass(Map.class);
            texto = body.get("texto") == null ? null : body.get("texto").toString();
        } catch (Exception e) {
            ctx.status(HttpStatus.BAD_REQUEST);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "VALIDACAO", "mensagem", "Body inválido.")));
            return;
        }
        if (texto == null || texto.isBlank()) {
            ctx.status(HttpStatus.BAD_REQUEST);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "VALIDACAO", "mensagem", "Campo 'texto' obrigatório.")));
            return;
        }
        String prompt = prompts.carregar("parse-tarefa");
        AiGateway.Resposta r = gateway.chamar(PromptRepository.VERSAO_ATUAL + "/parse-tarefa", prompt, texto);
        String json = AiGateway.extrairJson(r.conteudo());
        if (json == null) json = r.conteudo();
        telemetria(s.usuarioId(), "/api/v1/ai/parse-tarefa", r);
        // devolve a resposta crua + flag fallback
        Map<String, Object> dados = new LinkedHashMap<>();
        dados.put("modelo", gateway.modelo());
        dados.put("fallback", r.fallback());
        dados.put("motivo_fallback", r.motivoFallback());
        dados.put("tokens_in", r.tokensIn());
        dados.put("tokens_out", r.tokensOut());
        dados.put("latencia_ms", r.latenciaMs());
        try {
            dados.put("resultado", mapper.readTree(json));
        } catch (Exception e) {
            dados.put("resultado_texto", json);
        }
        ctx.json(Map.of("ok", true, "dados", dados));
    }

    private void sugerirProximo(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        String contexto;
        try {
            Map<?, ?> body = ctx.bodyAsClass(Map.class);
            Object t = body.get("tarefas");
            contexto = t == null ? "[]" : mapper.writeValueAsString(t);
        } catch (Exception e) {
            ctx.status(HttpStatus.BAD_REQUEST);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "VALIDACAO", "mensagem", "Body inválido.")));
            return;
        }
        String prompt = prompts.carregar("sugerir-proximo");
        AiGateway.Resposta r = gateway.chamar(PromptRepository.VERSAO_ATUAL + "/sugerir-proximo", prompt, contexto);
        String json = AiGateway.extrairJson(r.conteudo());
        if (json == null) json = r.conteudo();
        telemetria(s.usuarioId(), "/api/v1/ai/sugerir-proximo", r);
        Map<String, Object> dados = new LinkedHashMap<>();
        dados.put("modelo", gateway.modelo());
        dados.put("fallback", r.fallback());
        try {
            dados.put("sugestao", mapper.readTree(json));
        } catch (Exception e) {
            dados.put("sugestao_texto", json);
        }
        ctx.json(Map.of("ok", true, "dados", dados));
    }

    private void telemetria(String uid, String rota, AiGateway.Resposta r) {
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(
                "INSERT INTO ia_telemetria(usuario_id, rota, prompt_versao, modelo, tokens_in, tokens_out, latencia_ms, status, criado_em) " +
                "VALUES (?,?,?,?,?,?,?,?,?)")) {
            ps.setString(1, uid);
            ps.setString(2, rota);
            ps.setString(3, PromptRepository.VERSAO_ATUAL);
            ps.setString(4, gateway.modelo());
            ps.setInt(5, r.tokensIn());
            ps.setInt(6, r.tokensOut());
            ps.setInt(7, (int) r.latenciaMs());
            ps.setString(8, r.fallback() ? ("FALLBACK:" + (r.motivoFallback() == null ? "?" : r.motivoFallback())) : "OK");
            ps.setString(9, Instant.now().toString());
            ps.executeUpdate();
        } catch (SQLException e) {
            LOG.warn("Falha ao registrar telemetria IA (não bloqueante)", e);
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
}
