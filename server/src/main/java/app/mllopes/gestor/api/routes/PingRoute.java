package app.mllopes.gestor.api.routes;

import app.mllopes.gestor.api.db.Db;
import io.javalin.http.Context;
import io.javalin.http.Handler;
import org.jetbrains.annotations.NotNull;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * GET /api/v1/ping — endpoint de smoke test.
 * Retorna dados do servidor + um SELECT trivial no banco.
 *
 * <p>Versão 1: sem autenticação (Fase 2). Em F3 a rota exigirá
 * sessão válida (cookie gestor_sessao).
 */
public final class PingRoute implements Handler {

    private final Db db;

    public PingRoute(Db db) {
        this.db = db;
    }

    @Override
    public void handle(@NotNull Context ctx) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("ok", true);
        body.put("pong", true);
        body.put("app", "gestor-inteligente-de-demandas");
        body.put("versao", "0.1.0");
        body.put("api_versao", "1");
        body.put("servidor_agora", Instant.now().toString());
        body.put("request_id", ctx.attribute("requestId"));

        try (Connection c = db.conexao();
             Statement s = c.createStatement();
             ResultSet rs = s.executeQuery("SELECT sqlite_version() AS v, strftime('%Y-%m-%dT%H:%M:%fZ','now') AS agora")) {
            if (rs.next()) {
                body.put("sqlite_versao", rs.getString("v"));
                body.put("banco_agora", rs.getString("agora"));
            }
        } catch (Exception e) {
            body.put("ok", false);
            body.put("erro", e.getClass().getSimpleName() + ": " + e.getMessage());
            ctx.status(503);
        }

        ctx.json(body);
    }
}
