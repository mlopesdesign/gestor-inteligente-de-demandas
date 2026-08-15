package app.mllopes.gestor.api.routes;

import app.mllopes.gestor.api.auth.AuthService;
import app.mllopes.gestor.api.auth.SessionService;
import io.javalin.http.Context;
import io.javalin.http.Handler;
import io.javalin.http.HttpStatus;
import org.jetbrains.annotations.NotNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Rotas /api/v1/auth/* — login, logout, sessao, cadastro.
 * F3: abertas para F2 (sem auth obrigatória em /api/v1/ping).
 * F4+ podem ser protegidas por middleware se necessário.
 */
public final class AuthRoutes {

    private static final Logger LOG = LoggerFactory.getLogger(AuthRoutes.class);

    private final AuthService auth;
    private final SessionService session;

    public AuthRoutes(AuthService auth, SessionService session) {
        this.auth = auth;
        this.session = session;
    }

    public void register(io.javalin.Javalin app) {
        app.post("/api/v1/auth/cadastro", this::cadastro);
        app.post("/api/v1/auth/login", this::login);
        app.post("/api/v1/auth/logout", this::logout);
        app.get("/api/v1/auth/sessao", this::sessao);
        app.get("/api/v1/dispositivos", this::listarDispositivos);
        app.post("/api/v1/dispositivos/{id}/revogar", this::revogarDispositivo);
    }

    private void cadastro(@NotNull Context ctx) {
        try {
            Map<?, ?> body = ctx.bodyAsClass(Map.class);
            String email = str(body, "email");
            String senha = str(body, "senha");
            String nome = str(body, "nome");
            String dispNome = str(body, "dispositivo_nome");
            String sistema = str(body, "sistema");
            String appVersao = str(body, "app_versao");
            auth.cadastrar(new AuthService.Cadastro(email, senha, nome, dispNome, sistema, appVersao));
            ctx.status(HttpStatus.CREATED);
            ctx.json(Map.of("ok", true, "dados", Map.of("mensagem", "Conta criada. Faça login.")));
        } catch (IllegalArgumentException e) {
            ctx.status(HttpStatus.BAD_REQUEST);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "VALIDACAO", "mensagem", e.getMessage())));
        } catch (Exception e) {
            LOG.error("Falha no cadastro", e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "INTERNO", "mensagem", e.getMessage())));
        }
    }

    private void login(@NotNull Context ctx) {
        try {
            Map<?, ?> body = ctx.bodyAsClass(Map.class);
            String email = str(body, "email");
            String senha = str(body, "senha");
            String dispNome = str(body, "dispositivo_nome");
            String sistema = str(body, "sistema");
            String appVersao = str(body, "app_versao");
            AuthService.LoginResult r = auth.login(email, senha, dispNome, sistema, appVersao);
            // Set-Cookie
            ctx.cookie(SessionService.COOKIE, r.sessao().token(), 86400);
            // Resposta
            Map<String, Object> usuario = new LinkedHashMap<>();
            usuario.put("id", r.usuario().id);
            usuario.put("email", r.usuario().email);
            usuario.put("nome", r.usuario().nome);
            usuario.put("fuso", r.usuario().fuso);
            usuario.put("ia_habilitada", r.usuario().iaHabilitada);
            Map<String, Object> dados = new LinkedHashMap<>();
            dados.put("usuario", usuario);
            dados.put("sessao_expira_em", r.sessao().expiraEm().toString());
            ctx.json(Map.of("ok", true, "dados", dados));
        } catch (SecurityException e) {
            ctx.status(HttpStatus.UNAUTHORIZED);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "NAO_AUTENTICADO", "mensagem", e.getMessage())));
        } catch (IllegalArgumentException e) {
            ctx.status(HttpStatus.BAD_REQUEST);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "VALIDACAO", "mensagem", e.getMessage())));
        } catch (Exception e) {
            LOG.error("Falha no login", e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "INTERNO", "mensagem", e.getMessage())));
        }
    }

    private void logout(@NotNull Context ctx) {
        String token = ctx.cookie(SessionService.COOKIE);
        if (token != null) {
            SessionService.Sessao s = session.buscar(token);
            if (s != null) session.revogar(s.id());
        }
        ctx.removeCookie(SessionService.COOKIE);
        ctx.status(HttpStatus.NO_CONTENT);
    }

    private void sessao(@NotNull Context ctx) {
        String token = ctx.cookie(SessionService.COOKIE);
        SessionService.Sessao s = token == null ? null : session.buscar(token);
        if (s == null) {
            ctx.status(HttpStatus.UNAUTHORIZED);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "NAO_AUTENTICADO", "mensagem", "Sessão inválida ou expirada.")));
            return;
        }
        AuthService.Usuario u = auth.buscarUsuario(s.usuarioId());
        if (u == null) {
            ctx.status(HttpStatus.UNAUTHORIZED);
            ctx.json(Map.of("ok", false, "erro", Map.of("codigo", "NAO_AUTENTICADO", "mensagem", "Usuário não encontrado.")));
            return;
        }
        Map<String, Object> usuario = new LinkedHashMap<>();
        usuario.put("id", u.id);
        usuario.put("email", u.email);
        usuario.put("nome", u.nome);
        usuario.put("fuso", u.fuso);
        usuario.put("ia_habilitada", u.iaHabilitada);
        Map<String, Object> dados = new LinkedHashMap<>();
        dados.put("usuario", usuario);
        dados.put("sessao_expira_em", s.expiraEm().toString());
        ctx.json(Map.of("ok", true, "dados", dados));
    }

    private void listarDispositivos(@NotNull Context ctx) {
        SessionService.Sessao s = requireSession(ctx);
        if (s == null) return;
        ctx.json(Map.of("ok", true, "dados", auth.listarDispositivos(s.usuarioId())));
    }

    private void revogarDispositivo(@NotNull Context ctx) {
        SessionService.Sessao s = requireSession(ctx);
        if (s == null) return;
        String id = ctx.pathParam("id");
        session.revogarPorDispositivo(id);
        try (var c = app.mllopes.gestor.api.db.DbSingleton.INSTANCE.get().conexao();
             var ps = c.prepareStatement("UPDATE dispositivos SET revogado_em = ? WHERE id = ?")) {
            ps.setString(1, java.time.Instant.now().toString());
            ps.setString(2, id);
            ps.executeUpdate();
        } catch (Exception e) { LOG.warn("Falha ao marcar dispositivo revogado", e); }
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

    private static String str(Map<?, ?> body, String key) {
        Object v = body == null ? null : body.get(key);
        return v == null ? null : v.toString();
    }
}
