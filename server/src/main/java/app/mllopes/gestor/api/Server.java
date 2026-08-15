package app.mllopes.gestor.api;

import app.mllopes.gestor.api.auth.AuthService;
import app.mllopes.gestor.api.auth.SessionService;
import app.mllopes.gestor.api.ai.AiGateway;
import app.mllopes.gestor.api.ai.PromptRepository;
import app.mllopes.gestor.api.cobranca.CobrancaService;
import app.mllopes.gestor.api.cobranca.RecorrenciaService;
import app.mllopes.gestor.api.db.Db;
import app.mllopes.gestor.api.db.DbSingleton;
import app.mllopes.gestor.api.observability.CorrelationId;
import app.mllopes.gestor.api.routes.AiRoutes;
import app.mllopes.gestor.api.routes.AuthRoutes;
import app.mllopes.gestor.api.routes.CobrancaRoutes;
import app.mllopes.gestor.api.routes.GenericCrudRoutes;
import app.mllopes.gestor.api.routes.HealthRoute;
import app.mllopes.gestor.api.routes.PingRoute;
import app.mllopes.gestor.api.routes.SyncRoutes;
import app.mllopes.gestor.api.routes.TarefaRoutes;
import app.mllopes.gestor.api.sync.SyncService;
import io.javalin.Javalin;
import io.javalin.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

import java.util.List;
import java.util.UUID;

/**
 * Servidor central do Gestor Inteligente de Demandas.
 *
 * <p>Stack: Javalin 6 (sobre Jetty) + Xerial SQLite JDBC 3.50+ (WAL)
 *          + Flyway 10 + HikariCP 5 + Jackson 2 + Hibernate Validator 8.
 *
 * <p>Endpoints iniciais (Fase 2): {@code /api/v1/ping} e {@code /healthz}.
 * Demais rotas (auth, tarefas, projetos, sync, IA, SSE) chegam nas
 * Fases 3 a 6 conforme o plano de execução.
 *
 * <p>Identidade imutável: {@code app.mllopes.gestor} (AGENTS §1).
 * ADR 0001 rev 1 (Java 21 LTS).
 *
 * <p>Para rodar em dev:
 * <pre>{@code
 *   cd E:\Projetos\LOPES FOCUS
 *   . .\tools\setup-env.ps1
 *   mvn -pl server -am package
 *   java -jar server\target\server-0.1.0.jar
 * }</pre>
 */
public final class Server {

    private static final Logger LOG = LoggerFactory.getLogger(Server.class);

    public static final String API_VERSION = "1";
    public static final String APP_VERSION = "0.1.0";
    public static final int DEFAULT_PORT = 7070;

    private Server() {}

    public static void main(String[] args) {
        int port = resolvePort();
        String host = System.getenv().getOrDefault("GESTOR_HOST", "127.0.0.1");
        boolean dev = "1".equals(System.getenv("GESTOR_DEV")) || "true".equalsIgnoreCase(System.getenv("GESTOR_DEV"));

        LOG.info("Iniciando Gestor Inteligente de Demandas v{} (porta={}, host={}, dev={})",
                APP_VERSION, port, host, dev);

        Db db = new Db("data/gestor_central.db");
        db.migrar();
        DbSingleton.INSTANCE.set(db);

        Javalin app = Javalin.create(config -> {
            config.showJavalinBanner = false;
            config.useVirtualThreads = true;
            // JSON (Javalin 6.3)
            try {
                Class<?> jc = Class.forName("io.javalin.json.JavalinJackson");
                Object mapper = JacksonConfig.createObjectMapper();
                config.jsonMapper((io.javalin.json.JsonMapper) jc.getConstructor(com.fasterxml.jackson.databind.ObjectMapper.class, boolean.class).newInstance(mapper, false));
            } catch (Exception e) {
                LOG.warn("Não foi possível registrar Jackson customizado; usando default", e);
            }
            // Servir a web estática
            config.staticFiles.add(staticConfig -> {
                staticConfig.hostedPath = "/";
                staticConfig.directory = "web";
                staticConfig.location = io.javalin.http.staticfiles.Location.EXTERNAL;
            });
        });

        // Correlation ID por request
        app.before(ctx -> {
            String reqId = ctx.header("X-Request-Id");
            if (reqId == null || reqId.isBlank()) reqId = UUID.randomUUID().toString();
            MDC.put(CorrelationId.MDC_KEY, reqId);
            ctx.attribute("requestId", reqId);
        });
        app.after(ctx -> {
            ctx.header("X-Request-Id", ctx.attribute("requestId"));
            ctx.header("X-API-Version", API_VERSION);
            ctx.header("X-Content-Type-Options", "nosniff");
            ctx.header("Cache-Control", "no-store");
            MDC.remove(CorrelationId.MDC_KEY);
        });

        // Healthcheck
        app.get("/healthz", new HealthRoute(db));

        // Ping (v1)
        app.get("/api/v1/ping", new PingRoute(db));

        // Auth + Dispositivos
        SessionService sessionService = new SessionService(db);
        AuthService authService = new AuthService(db, sessionService);
        new AuthRoutes(authService, sessionService).register(app);

        // CRUDs genéricos
        new GenericCrudRoutes(db, sessionService, new GenericCrudRoutes.Spec(
            "areas", "areas", List.of("nome", "cor", "ordem"))).register(app);
        new GenericCrudRoutes(db, sessionService, new GenericCrudRoutes.Spec(
            "clientes", "clientes", List.of("nome", "organizacao", "contatos_json", "observacoes", "status"))).register(app);
        new GenericCrudRoutes(db, sessionService, new GenericCrudRoutes.Spec(
            "projetos", "projetos", List.of("titulo", "descricao", "cliente_id", "area_id",
                "status", "prioridade", "inicio_em", "fim_em"))).register(app);

        // Tarefas (rotas dedicadas com ações)
        new TarefaRoutes(db, sessionService).register(app);

        // Motor de cobrança contínua + recorrências (Fase 4)
        int intervaloCobranca = resolveInt("GESTOR_COBRANCA_MINUTOS", 1);
        int intervaloRecorrencia = resolveInt("GESTOR_RECURRENCIA_MINUTOS", 5);
        CobrancaService cobranca = new CobrancaService(db, intervaloCobranca);
        RecorrenciaService recorrencia = new RecorrenciaService(db, intervaloRecorrencia);
        if (!"1".equals(System.getenv("GESTOR_DAEMON_OFF"))) {
            cobranca.iniciar();
            recorrencia.iniciar();
        }
        new CobrancaRoutes(db, sessionService, cobranca).register(app);

        // Sincronização multi-dispositivo (Fase 5)
        SyncService syncService = new SyncService(db);
        new SyncRoutes(db, sessionService, syncService).register(app);

        // AI gateway (Fase 6) - prompts versionados, fallback heurístico
        AiGateway ai = AiGateway.fromEnv();
        PromptRepository prompts = new PromptRepository();
        new AiRoutes(db, sessionService, ai, prompts).register(app);
        LOG.info("IA gateway: {} (modelo={})", ai.disponivel() ? "ONLINE" : "FALLBACK_HEURISTICA", ai.modelo());

        // Handler de erro genérico
        app.exception(Exception.class, (e, ctx) -> {
            String reqId = ctx.attribute("requestId");
            LOG.error("Erro não tratado em {} {} (requestId={})", ctx.method(), ctx.path(), reqId, e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
            ctx.json(java.util.Map.of(
                "ok", false,
                "erro", java.util.Map.of(
                    "codigo", "INTERNO",
                    "mensagem", "Erro inesperado. Veja logs e contacte o suporte.",
                    "detalhes", java.util.Map.of("requestId", reqId)
                )
            ));
        });

        // 404 com corpo JSON
        app.error(HttpStatus.NOT_FOUND, ctx -> ctx.json(java.util.Map.of(
            "ok", false,
            "erro", java.util.Map.of(
                "codigo", "NAO_ENCONTRADO",
                "mensagem", "Recurso inexistente: " + ctx.method() + " " + ctx.path()
            )
        )));

        // Shutdown limpo
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            LOG.info("Encerrando Gestor Inteligente de Demandas...");
            try { app.stop(); } catch (Exception e) { LOG.warn("Erro ao parar Javalin", e); }
            try { db.close(); } catch (Exception e) { LOG.warn("Erro ao fechar banco", e); }
            LOG.info("Encerrado.");
        }, "shutdown-gestor"));

        app.start(host, port);

        LOG.info("Pronto. Endpoints: GET /api/v1/ping, GET /healthz, GET / (web estática)");
        LOG.info("Para parar: Ctrl+C ou kill (PID={})", ProcessHandle.current().pid());
    }

    private static int resolvePort() {
        String env = System.getenv("GESTOR_PORT");
        if (env == null || env.isBlank()) return DEFAULT_PORT;
        try {
            int p = Integer.parseInt(env.trim());
            if (p < 1 || p > 65535) throw new IllegalArgumentException();
            return p;
        } catch (Exception e) {
            LOG.warn("GESTOR_PORT inválido ('{}'); usando porta padrão {}", env, DEFAULT_PORT);
            return DEFAULT_PORT;
        }
    }

    private static int resolveInt(String varName, int def) {
        String env = System.getenv(varName);
        if (env == null || env.isBlank()) return def;
        try { return Math.max(1, Integer.parseInt(env.trim())); }
        catch (Exception e) { LOG.warn("{} inválido ('{}'); usando {}", varName, env, def); return def; }
    }
}
