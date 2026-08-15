package app.mllopes.gestor.api.core;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Motor de recorrências (puro, função estática).
 *
 * <p>Dada uma tarefa concluída e seu {@code recorrencia_json}, calcula:
 * <ol>
 *   <li>Quando a próxima ocorrência deve vencer.</li>
 *   <li>Se a recorrência chegou ao fim ({@code fim_em}).</li>
 *   <li>Quais campos do pai devem ser clonados (sem o id/versao/timestamps).</li>
 * </ol>
 *
 * <p>Schema de {@code recorrencia_json}:
 * <pre>{@code
 * {
 *   "frequencia": "DIARIA|SEMANAL|MENSAL",
 *   "intervalo": 1,
 *   "dias_semana": [1,2,3,4,5],   // 1=Seg ... 7=Dom (ISO), só p/ SEMANAL
 *   "dia_mes": 15,                // só p/ MENSAL
 *   "fim_em": "2026-12-31T23:59:59Z",
 *   "manter_vencimento_util": false,
 *   "max_ocorrencias": 12
 * }
 * }</pre>
 */
public final class RecorrenciaCore {

    private RecorrenciaCore() {}

    /** Tipos de frequência suportados. */
    public static final String F_DIARIA  = "DIARIA";
    public static final String F_SEMANAL = "SEMANAL";
    public static final String F_MENSAL  = "MENSAL";

    /** Resultado do cálculo de próxima ocorrência. */
    public record Proxima(
        boolean gerar,                   // false = recorrência encerrada
        Instant novoVencimentoEm,        // null se !gerar
        String titulo,                   // título sugerido p/ próxima tarefa
        String recorrenciaJsonOriginal,  // json inalterado (eco)
        String motivo                    // texto curto explicando
    ) {}

    /**
     * Calcula a próxima ocorrência.
     *
     * @param recorrenciaJson  JSON com a config; null ou vazio => não recorrente
     * @param vencimentoAtual  vencimento_em da tarefa que ACABOU de ser concluída
     * @param agora            instante de referência
     * @param fuso             fuso do usuário
     * @param ocorrenciaAtual número da ocorrência atual (1 = primeira)
     */
    public static Proxima calcular(String recorrenciaJson,
                                   Instant vencimentoAtual,
                                   Instant agora,
                                   ZoneId fuso,
                                   int ocorrenciaAtual) {
        if (recorrenciaJson == null || recorrenciaJson.isBlank()) {
            return new Proxima(false, null, null, null, "sem recorrencia_json");
        }

        JsonNode cfg;
        try {
            cfg = new ObjectMapper().readTree(recorrenciaJson);
        } catch (Exception e) {
            return new Proxima(false, null, null, recorrenciaJson, "JSON inválido: " + e.getMessage());
        }

        String freq = textOr(cfg, "frequencia", null);
        if (freq == null) {
            return new Proxima(false, null, null, recorrenciaJson, "frequência ausente");
        }
        int intervalo = intOr(cfg, "intervalo", 1);
        if (intervalo < 1) intervalo = 1;

        // Verifica fim explícito
        String fimEmStr = textOr(cfg, "fim_em", null);
        Instant fimEm = null;
        if (fimEmStr != null) {
            try { fimEm = Instant.parse(fimEmStr); } catch (Exception ignored) {}
        }
        Integer maxOc = cfg.has("max_ocorrencias") && cfg.get("max_ocorrencias").isInt()
                ? cfg.get("max_ocorrencias").asInt() : null;
        if (maxOc != null && ocorrenciaAtual >= maxOc) {
            return new Proxima(false, null, null, recorrenciaJson,
                "atingido max_ocorrencias=" + maxOc);
        }

        // Calcula próximo vencimento
        Instant base = vencimentoAtual != null ? vencimentoAtual : agora;
        Instant proximo = switch (freq) {
            case F_DIARIA  -> proximaDiaria(base, intervalo, agora, fuso, cfg);
            case F_SEMANAL -> proximaSemanal(base, intervalo, agora, fuso, cfg);
            case F_MENSAL  -> proximaMensal(base, intervalo, agora, fuso, cfg);
            default -> null;
        };
        if (proximo == null) {
            return new Proxima(false, null, null, recorrenciaJson, "frequência inválida: " + freq);
        }

        // Se fim_em já passou, não gera mais
        if (fimEm != null && proximo.isAfter(fimEm)) {
            return new Proxima(false, null, null, recorrenciaJson,
                "próximo (" + proximo + ") após fim_em (" + fimEm + ")");
        }

        return new Proxima(true, proximo, "Tarefa recorrente", recorrenciaJson,
            "freq=" + freq + " intervalo=" + intervalo);
    }

    private static Instant proximaDiaria(Instant base, int intervalo, Instant agora,
                                         ZoneId fuso, JsonNode cfg) {
        ZonedDateTime z = base.atZone(fuso);
        // Se a base é no passado, o próximo é: base + (intervalo * 1 dia) sempre,
        // alinhado com hora do dia da base. (Simples e determinístico.)
        ZonedDateTime next = z.plus(intervalo, ChronoUnit.DAYS);
        return ajustarParaUtil(next, cfg, fuso).toInstant();
    }

    private static Instant proximaSemanal(Instant base, int intervalo, Instant agora,
                                          ZoneId fuso, JsonNode cfg) {
        // dias_semana é lista 1..7 ISO (Seg..Dom). Achar o próximo dia da semana
        // que esteja na lista e seja >= hoje (ZonedDateTime 'hoje' = agora no fuso).
        java.util.List<Integer> dias = new java.util.ArrayList<>();
        if (cfg.has("dias_semana") && cfg.get("dias_semana").isArray()) {
            for (JsonNode n : cfg.get("dias_semana")) dias.add(n.asInt());
        }
        if (dias.isEmpty()) {
            // Default: mesmo dia da semana da base
            dias.add(base.atZone(fuso).getDayOfWeek().getValue());
        }
        // Acha o próximo ISO day-of-week >= hoje
        ZonedDateTime hoje = agora.atZone(fuso);
        ZonedDateTime candidate = null;
        for (int add = 0; add < 14; add++) { // no máximo 2 semanas
            ZonedDateTime d = hoje.plusDays(add);
            int iso = d.getDayOfWeek().getValue();
            if (dias.contains(iso)) {
                LocalTime hora = base.atZone(fuso).toLocalTime();
                ZonedDateTime tentativa = d.with(hora);
                // A primeira ocorrência precisa ser > base (não no passado)
                if (tentativa.isAfter(base.atZone(fuso))) {
                    candidate = tentativa;
                    break;
                }
            }
        }
        if (candidate == null) {
            // fallback: +intervalo semanas
            candidate = base.atZone(fuso).plusWeeks(intervalo);
        }
        return ajustarParaUtil(candidate, cfg, fuso).toInstant();
    }

    private static Instant proximaMensal(Instant base, int intervalo, Instant agora,
                                         ZoneId fuso, JsonNode cfg) {
        Integer diaMes = cfg.has("dia_mes") && cfg.get("dia_mes").isInt()
                ? cfg.get("dia_mes").asInt() : null;
        ZonedDateTime z = base.atZone(fuso);
        if (diaMes == null) diaMes = z.getDayOfMonth();
        // Próximo mês
        ZonedDateTime candidate = z.plusMonths(intervalo);
        // Ajusta dia do mês (clamp)
        int maxDia = candidate.toLocalDate().lengthOfMonth();
        int dia = Math.min(diaMes, maxDia);
        candidate = candidate.withDayOfMonth(dia);
        return ajustarParaUtil(candidate, cfg, fuso).toInstant();
    }

    /** Se {@code manter_vencimento_util} for true, pula fim-de-semana para próximo dia útil. */
    private static ZonedDateTime ajustarParaUtil(ZonedDateTime z, JsonNode cfg, ZoneId fuso) {
        boolean manter = cfg.has("manter_vencimento_util") && cfg.get("manter_vencimento_util").asBoolean();
        if (!manter) return z;
        DayOfWeek d = z.getDayOfWeek();
        if (d == DayOfWeek.SATURDAY) return z.plusDays(2);
        if (d == DayOfWeek.SUNDAY)   return z.plusDays(1);
        return z;
    }

    /** Clona campos do pai para o filho: tudo menos id/versao/timestamps/datas derivadas. */
    public static java.util.Map<String, Object> clonarCampos(java.util.Map<String, Object> tarefaPai) {
        java.util.Map<String, Object> out = new java.util.LinkedHashMap<>();
        for (java.util.Map.Entry<String, Object> e : tarefaPai.entrySet()) {
            String k = e.getKey().toLowerCase();
            if (k.equals("id") || k.equals("versao") || k.equals("criado_em")
                || k.equals("atualizado_em") || k.equals("concluida_em")
                || k.equals("entregue_em") || k.equals("confirmada_em")
                || k.equals("vencimento_em") || k.equals("status")) {
                continue;
            }
            out.put(e.getKey(), e.getValue());
        }
        return out;
    }

    @SuppressWarnings("unused")
    private static LocalDateTime unused() { return LocalDateTime.now(); }
    @SuppressWarnings("unused")
    private static LocalDate unusedDate() { return LocalDate.now(); }

    private static String textOr(JsonNode n, String f, String def) {
        return n.has(f) && !n.get(f).isNull() ? n.get(f).asText() : def;
    }
    private static int intOr(JsonNode n, String f, int def) {
        return n.has(f) && n.get(f).isInt() ? n.get(f).asInt() : def;
    }
}
