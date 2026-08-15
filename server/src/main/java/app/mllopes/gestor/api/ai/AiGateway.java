package app.mllopes.gestor.api.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Gateway de IA: isola a chamada à OpenAI (ou heurística local se
 * {@code OPENAI_API_KEY} não estiver definida) e mantém o histórico de
 * telemetria em {@code ia_telemetria}.
 *
 * <p>Conforme ADR 0004 e docs/01-MODELO-DOMINIO.md §"IA opcional".
 * <b>Princípio AGENTS §4.3: a IA nunca é dependência das funções
 * essenciais</b> — se a chamada falhar, devolvemos a heurística.
 */
public final class AiGateway {

    private static final Logger LOG = LoggerFactory.getLogger(AiGateway.class);
    private static final Pattern JSON_BLOCK = Pattern.compile("\\{[\\s\\S]*\\}");

    private final String apiKey;
    private final String modelo;
    private final HttpClient http;
    private final ObjectMapper mapper = new ObjectMapper();

    public AiGateway(String apiKey, String modelo) {
        this.apiKey = apiKey;
        this.modelo = modelo == null ? "gpt-4o-mini" : modelo;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    public static AiGateway fromEnv() {
        String k = System.getenv("OPENAI_API_KEY");
        String m = System.getenv("OPENAI_MODELO");
        return new AiGateway(k, m);
    }

    public boolean disponivel() {
        return apiKey != null && !apiKey.isBlank();
    }

    /** Modelo efetivo (para telemetria). */
    public String modelo() { return modelo; }

    /** Resultado bruto da chamada. */
    public record Resposta(String conteudo, int tokensIn, int tokensOut, long latenciaMs,
                            boolean fallback, String motivoFallback) {}

    /**
     * Chama a IA com um prompt (versão do template) e o input do usuário.
     * Se a chave não estiver disponível, devolve heurística local marcada
     * como fallback=true.
     */
    public Resposta chamar(String promptVersao, String promptTexto, String inputUsuario) {
        if (!disponivel()) {
            return heuristica(promptVersao, inputUsuario, "chave OPENAI_API_KEY ausente");
        }
        long t0 = System.currentTimeMillis();
        try {
            String body = montarBody(promptTexto, inputUsuario);
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            long dt = System.currentTimeMillis() - t0;
            if (resp.statusCode() / 100 != 2) {
                LOG.warn("OpenAI status {}: {}", resp.statusCode(),
                    resp.body() == null ? "" : resp.body().substring(0, Math.min(200, resp.body().length())));
                return heuristica(promptVersao, inputUsuario,
                    "openai_status_" + resp.statusCode());
            }
            JsonNode root = mapper.readTree(resp.body());
            String conteudo = root.path("choices").path(0).path("message").path("content").asText("");
            int inTok = root.path("usage").path("prompt_tokens").asInt(0);
            int outTok = root.path("usage").path("completion_tokens").asInt(0);
            return new Resposta(conteudo, inTok, outTok, dt, false, null);
        } catch (IOException | InterruptedException e) {
            LOG.warn("Falha ao chamar OpenAI, usando heurística", e);
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            return heuristica(promptVersao, inputUsuario, "erro: " + e.getClass().getSimpleName());
        }
    }

    private String montarBody(String promptTexto, String inputUsuario) throws IOException {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", modelo);
        body.put("temperature", 0.2);
        body.put("response_format", Map.of("type", "json_object"));
        body.put("messages", List.of(
            Map.of("role", "system", "content", promptTexto),
            Map.of("role", "user", "content", inputUsuario)
        ));
        return mapper.writeValueAsString(body);
    }

    /**
     * Heurística local: extrai primeira frase como título, devolve JSON
     * mínimo válido. Usado quando a OpenAI não está disponível.
     */
    public Resposta heuristica(String promptVersao, String inputUsuario, String motivo) {
        String txt = inputUsuario == null ? "" : inputUsuario.trim();
        String titulo = txt.split("[\\.\\n\\?\\!]")[0];
        if (titulo.length() > 200) titulo = titulo.substring(0, 200);
        String tituloFinal = titulo.isBlank() ? "(sem título)" : titulo;
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        sb.append("\"titulo\":").append(jsonString(tituloFinal)).append(",");
        sb.append("\"descricao\":").append(jsonString(txt)).append(",");
        sb.append("\"prioridade\":\"NORMAL\",");
        sb.append("\"nivel_cobranca\":\"PERSISTENTE\",");
        sb.append("\"etiquetas\":[],");
        sb.append("\"vencimento_em\":null,");
        sb.append("\"recorrencia_json\":null");
        sb.append("}");
        return new Resposta(sb.toString(), 0, 0, 0, true, motivo);
    }

    private static String jsonString(String s) {
        if (s == null) return "\"\"";
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"':  sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        sb.append("\"");
        return sb.toString();
    }

    /**
     * Extrai o primeiro bloco JSON válido de uma resposta da IA.
     * Útil quando o modelo devolve texto com JSON embutido.
     */
    public static String extrairJson(String texto) {
        if (texto == null) return null;
        Matcher m = JSON_BLOCK.matcher(texto);
        if (m.find()) return m.group();
        return null;
    }
}
