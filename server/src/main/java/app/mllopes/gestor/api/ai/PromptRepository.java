package app.mllopes.gestor.api.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Repositório versionado de prompts: lê arquivos de
 * {@code classpath:prompts/v<n>/<nome>.txt} e expõe o conteúdo.
 *
 * <p>Conforme ADR 0004 §"prompts versionados": cada mudança de prompt
 * ganha nova pasta {@code vN+1}, mantendo a anterior servível para
 * auditoria / reprocessamento.
 */
public final class PromptRepository {

    private static final Logger LOG = LoggerFactory.getLogger(PromptRepository.class);
    public static final String VERSAO_ATUAL = "v1";

    private final Map<String, String> cache = new LinkedHashMap<>();

    public String carregar(String nomePrompt) {
        return carregar(VERSAO_ATUAL, nomePrompt);
    }

    public String carregar(String versao, String nomePrompt) {
        String key = versao + "::" + nomePrompt;
        if (cache.containsKey(key)) return cache.get(key);
        String path = "prompts/" + versao + "/" + nomePrompt + ".txt";
        try (InputStream in = getClass().getClassLoader().getResourceAsStream(path)) {
            if (in == null) {
                LOG.warn("Prompt não encontrado: {}", path);
                cache.put(key, "");
                return "";
            }
            String s = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            cache.put(key, s);
            return s;
        } catch (IOException e) {
            LOG.error("Falha ao ler prompt {}", path, e);
            return "";
        }
    }
}
