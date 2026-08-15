package app.mllopes.gestor.api.routes;

import app.mllopes.gestor.api.auth.SessionService;
import app.mllopes.gestor.api.core.Crud;
import app.mllopes.gestor.api.db.Db;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import org.jetbrains.annotations.NotNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

/**
 * Rotas CRUD genéricas para entidades simples (areas, clientes, projetos).
 * Para tarefas (com ações, status, subtarefas), usar TarefaRoutes.
 */
public final class GenericCrudRoutes {

    private static final Logger LOG = LoggerFactory.getLogger(GenericCrudRoutes.class);

    public static final class Spec {
        public final String path;          // ex: "areas"
        public final String tabela;        // ex: "areas"
        public final List<String> colunas; // ex: ["nome","cor","ordem"]
        public Spec(String path, String tabela, List<String> colunas) {
            this.path = path; this.tabela = tabela; this.colunas = colunas;
        }
    }

    private final Db db;
    private final SessionService session;
    private final Spec spec;

    public GenericCrudRoutes(Db db, SessionService session, Spec spec) {
        this.db = db; this.session = session; this.spec = spec;
    }

    public void register(io.javalin.Javalin app) {
        String base = "/api/v1/" + spec.path;
        app.get(base, this::listar);
        app.post(base, this::criar);
        app.get(base + "/{id}", this::buscar);
        app.patch(base + "/{id}", this::atualizar);
        app.delete(base + "/{id}", this::deletar);
    }

    private void listar(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        Crud c = new Crud(db, spec.tabela, spec.colunas);
        ctx.json(Map.of("ok", true, "dados", c.listar(s.usuarioId())));
    }

    private void buscar(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        Crud c = new Crud(db, spec.tabela, spec.colunas);
        Map<String, Object> row = c.buscar(s.usuarioId(), ctx.pathParam("id"));
        if (row == null) {
            ctx.status(HttpStatus.NOT_FOUND);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "NAO_ENCONTRADO", "mensagem", spec.path + " não encontrado.")));
            return;
        }
        ctx.json(Map.of("ok", true, "dados", row));
    }

    private void criar(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        try {
            Map<?, ?> body = ctx.bodyAsClass(Map.class);
            Crud c = new Crud(db, spec.tabela, spec.colunas);
            String id = c.criar(s.usuarioId(), (Map<String, Object>) body);
            ctx.status(HttpStatus.CREATED);
            Map<String, Object> row = c.buscar(s.usuarioId(), id);
            ctx.json(Map.of("ok", true, "dados", row));
        } catch (IllegalArgumentException e) {
            ctx.status(HttpStatus.BAD_REQUEST);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "VALIDACAO", "mensagem", e.getMessage())));
        } catch (Exception e) {
            LOG.error("Falha ao criar " + spec.tabela, e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "INTERNO", "mensagem", e.getMessage())));
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
            Crud c = new Crud(db, spec.tabela, spec.colunas);
            boolean ok = c.atualizar(s.usuarioId(), ctx.pathParam("id"), versao, (Map<String, Object>) body);
            if (!ok) {
                ctx.status(HttpStatus.CONFLICT);
                ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "CONFLITO_VERSAO", "mensagem", "Versão desatualizada.")));
                return;
            }
            Map<String, Object> row = c.buscar(s.usuarioId(), ctx.pathParam("id"));
            ctx.json(Map.of("ok", true, "dados", row));
        } catch (Exception e) {
            LOG.error("Falha ao atualizar " + spec.tabela, e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "INTERNO", "mensagem", e.getMessage())));
        }
    }

    private void deletar(@NotNull Context ctx) {
        var s = requireSession(ctx); if (s == null) return;
        Crud c = new Crud(db, spec.tabela, spec.colunas);
        boolean ok = c.deletar(s.usuarioId(), ctx.pathParam("id"));
        if (!ok) {
            ctx.status(HttpStatus.NOT_FOUND);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "NAO_ENCONTRADO", "mensagem", spec.path + " não encontrado.")));
            return;
        }
        ctx.status(HttpStatus.NO_CONTENT);
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

    private static int intOrZero(Map<?, ?> body, String key) {
        Object v = body == null ? null : body.get(key);
        if (v == null) return 0;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(v.toString()); } catch (Exception e) { return 0; }
    }
}
