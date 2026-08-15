package app.mllopes.gestor.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Teste 2/5 — Jackson: snake_case, ISO 8601, ignora nulos, ignora unknown.
 */
class JacksonConfigTest {

    @Test
    void serializeComConvencoes() throws Exception {
        ObjectMapper m = JacksonConfig.createObjectMapper();
        // Cria POJO anônimo para teste de naming strategy
        class P {
            public Instant getCriadoEm() { return Instant.parse("2026-08-14T19:00:00Z"); }
            public boolean isVisivel() { return true; }
            public String getExtras() { return "preservar"; }
            public String getIgnorar() { return null; }
        }
        String json = m.writeValueAsString(new P());
        assertTrue(json.contains("\"criado_em\""), "deve serializar como snake_case, mas foi: " + json);
        assertTrue(json.contains("\"visivel\""), "deve manter booleano");
        assertFalse(json.contains("\"ignorar\""), "nao deve serializar nulls, mas foi: " + json);
        assertTrue(json.contains("2026-08-14T19:00:00Z"), "deve serializar Instant como ISO 8601");

        // Não falhar em propriedade desconhecida
        Map<?, ?> deVolta = m.readValue("{\"extras\":\"ok\",\"nao_mapeado\":\"x\"}", Map.class);
        assertEquals("ok", deVolta.get("extras"));
    }
}
