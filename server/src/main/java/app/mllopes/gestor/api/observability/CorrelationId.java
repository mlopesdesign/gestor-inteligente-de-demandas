package app.mllopes.gestor.api.observability;

/**
 * Chave do MDC (SLF4J) para correlation id por requisição.
 * Ver {@code Server.java} onde o id é injetado no before/after.
 */
public final class CorrelationId {

    public static final String MDC_KEY = "requestId";
    public static final String HEADER = "X-Request-Id";

    private CorrelationId() {}
}
