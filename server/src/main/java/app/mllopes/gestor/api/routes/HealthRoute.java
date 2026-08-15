package app.mllopes.gestor.api.routes;

import app.mllopes.gestor.api.db.Db;
import io.javalin.http.Context;
import io.javalin.http.Handler;
import org.jetbrains.annotations.NotNull;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * GET /healthz — healthcheck simples, sem autenticação.
 * Retorna 200 se o banco responde a PRAGMA quick_check; 503 caso contrário.
 */
public final class HealthRoute implements Handler {

    private final Db db;

    public HealthRoute(Db db) {
        this.db = db;
    }

    @Override
    public void handle(@NotNull Context ctx) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("ok", true);
        body.put("app", "gestor-inteligente-de-demandas");
        body.put("versao", "0.1.0");
        body.put("api_versao", "1");
        try {
            body.put("banco_ok", db.integro());
        } catch (Exception e) {
            body.put("banco_ok", false);
            body.put("banco_erro", e.getClass().getSimpleName() + ": " + e.getMessage());
        }
        ctx.json(body);
    }
}
