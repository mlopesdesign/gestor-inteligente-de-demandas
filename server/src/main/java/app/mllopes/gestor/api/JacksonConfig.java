package app.mllopes.gestor.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

/**
 * Configuração do Jackson (ObjectMapper) para o servidor.
 *
 * <p>Convenções:
 * <ul>
 *   <li>Propriedades em snake_case (mantém compatibilidade com o OpenAPI v1).</li>
 *   <li>{@code java.time} serializado como ISO 8601 string.</li>
 *   <li>Não inclui campos nulos (reduz payload; cliente trata ausência como null).</li>
 *   <li>Falha em propriedades desconhecidas só se explicitamente habilitado (defensivo por padrão).</li>
 * </ul>
 */
public final class JacksonConfig {

    private JacksonConfig() {}

    public static ObjectMapper createObjectMapper() {
        ObjectMapper m = new ObjectMapper();
        m.registerModule(new JavaTimeModule());
        m.setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
        m.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        m.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        m.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        return m;
    }
}
