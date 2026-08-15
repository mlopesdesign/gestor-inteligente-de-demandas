package app.mllopes.gestor.api.observability;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Teste 5/5 — Constantes de correlation id e header HTTP batem.
 */
class CorrelationIdTest {

    @Test
    void constantesCoerentes() {
        assertEquals("requestId", CorrelationId.MDC_KEY);
        assertEquals("X-Request-Id", CorrelationId.HEADER);
        // MDC key e header.HTTP são consistentes com o Server.java
        assertTrue(CorrelationId.HEADER.startsWith("X-"), "header deve ter prefixo X-");
        assertTrue(CorrelationId.MDC_KEY.length() < CorrelationId.HEADER.length(),
                "MDC key deve ser mais curto que header (uso interno)");
    }
}
