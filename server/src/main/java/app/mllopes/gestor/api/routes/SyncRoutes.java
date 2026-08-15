package app.mllopes.gestor.api.routes;

import app.mllopes.gestor.api.auth.SessionService;
import app.mllopes.gestor.api.db.Db;
import app.mllopes.gestor.api.sync.SyncService;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import io.javalin.http.sse.SseClient;
import org.jetbrains.annotations.NotNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Rotas de sincronização:
 * <ul>
 *   <li>POST /api/v1/sync/push — cliente envia lote de mudanças locais</li>
 *   <li>GET  /api/v1/sync/pull?desde=&limite= — servidor devolve mudanças após cursor</li>
 *   <li>GET  /api/v1/sync/conflitos — lista conflitos pendentes</li>
 *   <li>POST /api/v1/sync/conflitos/{id}/resolver — resolve manualmente</li>
 *   <li>GET  /api/v1/sync/eventos — SSE: push em tempo real de mudanças</li>
 * </ul>
 */
public final class SyncRoutes {

    private static final Logger LOG = LoggerFactory.getLogger(SyncRoutes.class);

    private final Db db;
    private final SessionService session;
    private final SyncService service;
    private final List<SseClient> clientes = new CopyOnWriteArrayList<>();
    private final java.util.Map<SseClient, String> clienteUsuario = new java.util.concurrent.ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> clienteEventos = new ConcurrentHashMap<>();

    public SyncRoutes(Db db, SessionService session, SyncService service) {
        this.db = db; this.session = session; this.service = service;
    }

    public void register(io.javalin.Javalin app) {
        app.post("/api/v1/sync/push", this::push);
        app.get("/api/v1/sync/pull", this::pull);
        app.get("/api/v1/sync/conflitos", this::listarConflitos);
        app.get("/api/v1/sync/conflitos/{id}", this::buscarConflito);
        app.post("/api/v1/sync/conflitos/{id}/resolver", this::resolverConflito);
        app.sse("/api/v1/sync/eventos", this::eventos);
    }

    private void push(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        try {
            Map<?, ?> body = ctx.bodyAsClass(Map.class);
            Object disp = body.get("dispositivo_id");
            String dispositivoId = disp == null ? s.dispositivoId() : disp.toString();
            Object mud = body.get("mudancas");
            if (!(mud instanceof List<?> lista)) {
                ctx.status(HttpStatus.BAD_REQUEST);
                ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "VALIDACAO", "mensagem", "mudancas deve ser lista")));
                return;
            }
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> mudancas = (List<Map<String, Object>>) lista;
            SyncService.PushResultado r = service.push(s.usuarioId(), dispositivoId, mudancas);
            // Notifica outros clientes SSE
            for (SseClient cli : clientes) {
                try {
                    String sessUsuario = clienteUsuario.get(cli);
                    if (sessUsuario == null || !sessUsuario.equals(s.usuarioId())) continue;
                    cli.sendEvent("sync_aplicada", "{\"total\":" + r.aplicadas + "}");
                } catch (Exception e) { /* cliente caiu */ }
            }
            ctx.json(Map.of("ok", true, "dados", Map.of(
                "aplicadas", r.aplicadas,
                "conflitos", r.conflitos,
                "detalhes", r.detalhes
            )));
        } catch (Exception e) {
            LOG.error("Falha no push", e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "INTERNO", "mensagem", e.getMessage())));
        }
    }

    private void pull(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        long desde = 0; int limite = 200;
        try { desde = Long.parseLong(ctx.queryParamAsClass("desde", String.class).getOrDefault("0")); } catch (Exception ignored) {}
        try { limite = Integer.parseInt(ctx.queryParamAsClass("limite", String.class).getOrDefault("200")); } catch (Exception ignored) {}
        List<Map<String, Object>> out = service.pull(s.usuarioId(), s.dispositivoId(), desde, limite);
        long maior = desde;
        for (Map<String, Object> m : out) {
            long id = ((Number) m.get("id")).longValue();
            if (id > maior) maior = id;
        }
        ctx.json(Map.of("ok", true, "dados", Map.of(
            "mudancas", out,
            "proximo_cursor", maior
        )));
    }

    private void listarConflitos(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        String estado = ctx.queryParam("estado");
        List<Map<String, Object>> out = service.listarConflitos(s.usuarioId(), estado);
        ctx.json(Map.of("ok", true, "dados", out));
    }

    private void buscarConflito(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        long id;
        try { id = Long.parseLong(ctx.pathParam("id")); }
        catch (Exception e) {
            ctx.status(HttpStatus.BAD_REQUEST);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "VALIDACAO", "mensagem", "id inválido")));
            return;
        }
        Map<String, Object> c = service.buscarConflito(s.usuarioId(), id);
        if (c == null) {
            ctx.status(HttpStatus.NOT_FOUND);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "NAO_ENCONTRADO", "mensagem", "Conflito inexistente")));
            return;
        }
        ctx.json(Map.of("ok", true, "dados", c));
    }

    private void resolverConflito(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        long id;
        try { id = Long.parseLong(ctx.pathParam("id")); }
        catch (Exception e) {
            ctx.status(HttpStatus.BAD_REQUEST);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "VALIDACAO", "mensagem", "id inválido")));
            return;
        }
        try {
            Map<?, ?> body = ctx.bodyAsClass(Map.class);
            String escolha = body.get("escolha") == null ? null : body.get("escolha").toString();
            boolean ok = service.resolverConflito(s.usuarioId(), id, escolha, s.usuarioId());
            if (!ok) {
                ctx.status(HttpStatus.NOT_FOUND);
                ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "NAO_ENCONTRADO", "mensagem", "Conflito inexistente ou já resolvido")));
                return;
            }
            ctx.json(Map.of("ok", true, "dados", Map.of("id", id, "escolha", escolha)));
        } catch (Exception e) {
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "INTERNO", "mensagem", e.getMessage())));
        }
    }

    private void eventos(@NotNull SseClient cli) {
        // Pega sessão via cookie
        var s = session.buscar(cookieToken(cli));
        if (s == null) {
            cli.sendEvent("erro", "{\"codigo\":\"NAO_AUTENTICADO\"}");
            cli.keepAlive();
            return;
        }
        clientes.add(cli);
        clienteUsuario.put(cli, s.usuarioId());
        cli.sendEvent("hello", "{\"usuario_id\":\"" + s.usuarioId() + "\"}");
        cli.keepAlive();
        cli.onClose(() -> {
            clientes.remove(cli);
            clienteUsuario.remove(cli);
        });
    }

    private String cookieToken(SseClient cli) {
        try {
            return cli.ctx().cookie(SessionService.COOKIE);
        } catch (Exception e) { return null; }
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
