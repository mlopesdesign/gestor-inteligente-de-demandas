package app.mllopes.gestor.api.core;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Resultado padrão para serviços. Sucesso: {@link Ok}; Falha: {@link Err}.
 * Evita exceções para falhas esperadas (validação, conflito, etc.).
 */
public sealed interface Result<T> {

    record Ok<T>(T dados) implements Result<T> {
        public static <T> Ok<T> of(T dados) { return new Ok<>(dados); }
    }
    record Err<T>(String codigo, String mensagem, Map<String, Object> detalhes) implements Result<T> {
        public static <T> Err<T> of(String codigo, String mensagem) { return new Err<>(codigo, mensagem, Map.of()); }
        public static <T> Err<T> of(String codigo, String mensagem, Map<String, Object> detalhes) { return new Err<>(codigo, mensagem, detalhes); }
        public Map<String, Object> toJson() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("codigo", codigo);
            m.put("mensagem", mensagem);
            if (detalhes != null && !detalhes.isEmpty()) m.put("detalhes", detalhes);
            return m;
        }
    }

    static <T> Result<T> ok(T dados) { return new Ok<>(dados); }
    static <T> Result<T> err(String codigo, String mensagem) { return Err.of(codigo, mensagem); }
    static <T> Result<T> err(String codigo, String mensagem, Map<String, Object> detalhes) { return Err.of(codigo, mensagem, detalhes); }

    default boolean isOk() { return this instanceof Ok; }
    default Optional<T> dadosOpt() { return this instanceof Ok<T> o ? Optional.ofNullable(o.dados()) : Optional.empty(); }
}
