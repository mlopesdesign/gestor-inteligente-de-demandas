package app.mllopes.gestor.api.core;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * Motor de cobrança contínua (puro, função estática).
 *
 * <p>Decide, dado uma tarefa e o instante atual, qual é o próximo passo de
 * cobrança: quando a próxima notificação deve sair, em qual nível, e se a
 * tarefa deve ser escalada (prioridade, status, alerta ao dono).
 *
 * <p>Regras em {@code docs/01-MODELO-DOMINIO.md} §"Cobrança contínua" e
 * AGENTS §4.5 ("cobrança é contínua até decisão explícita").
 *
 * <p>Princípio: ZERO sobrescrita silenciosa. Toda escalada é registrada
 * (a persistência é responsabilidade do chamador via {@link CobrancaDecisao}).
 */
public final class CobrancaCore {

    private CobrancaCore() {}

    /** Resultado de uma avaliação de cobrança. Imutável. */
    public record CobrancaDecisao(
        boolean notificar,                  // deve sair notificação agora
        long proximaCobrancaEmSegundos,     // -1 = não reagendar (tarefa resolvida)
        String nivelAplicado,               // nível efetivo (pode ser escalado)
        String prioridadeAplicada,          // prioridade efetiva (pode ser escalada)
        boolean bloquear,                   // true se atrasada muito para nivel CRITICA
        String motivo                       // texto curto explicando a decisão
    ) {}

    /** Política por nível (em segundos entre cobranças enquanto vencida). */
    public static long intervaloSegundos(String nivel) {
        if (nivel == null) return 14400L; // PERSISTENTE default
        return switch (nivel) {
            case "DISCRETA"    -> 86400L;   // 1x por dia
            case "PERSISTENTE" -> 14400L;   // a cada 4h
            case "INTENSIVA"   -> 3600L;    // a cada 1h
            case "CRITICA"     -> 900L;     // a cada 15min
            default            -> 14400L;
        };
    }

    /** Limite (em horas) a partir do qual uma tarefa no nível CRITICA deve ser BLOQUEADA. */
    public static long horasAteBloqueio(String prioridade) {
        if (prioridade == null) return 72L;
        return switch (prioridade) {
            case "BAIXA"    -> 168L; // 7 dias
            case "NORMAL"   -> 72L;  // 3 dias
            case "ALTA"     -> 48L;  // 2 dias
            case "URGENTE"  -> 24L;  // 1 dia
            case "CRITICA"  -> 12L;  // 12 horas
            default         -> 72L;
        };
    }

    /** Avalia a tarefa e devolve a próxima ação de cobrança. */
    public static CobrancaDecisao avaliar(
            String status,
            String prioridade,
            String nivelCobranca,
            Instant vencimentoEm,
            Instant ultimaCobrancaEm,
            Instant agora,
            ZoneId fuso,
            int horaInicio,
            int horaFim,
            boolean silenciarForaHorario
    ) {
        // Tarefa resolvida: sem cobrança
        if (status == null) {
            return new CobrancaDecisao(false, -1, nivelCobranca, prioridade, false, "status nulo");
        }
        switch (status) {
            case "CONCLUIDA":
            case "CANCELADA":
            case "ARQUIVADA":
                return new CobrancaDecisao(false, -1, nivelCobranca, prioridade, false, "tarefa resolvida (" + status + ")");
            default: // segue
        }

        // Sem vencimento: cobra presença (1x/dia se criada há mais de 7 dias, ou nunca)
        if (vencimentoEm == null) {
            return new CobrancaDecisao(false, -1, nivelCobranca, prioridade, false, "sem vencimento");
        }

        // Calcular atraso
        Duration atraso = Duration.between(vencimentoEm, agora);
        long horasAtraso = Math.max(0, atraso.toHours());
        long minutosAtraso = Math.max(0, atraso.toMinutes());

        // Escalonamento de nível por atraso
        String nivel = nivelCobranca == null ? "PERSISTENTE" : nivelCobranca;
        String prio  = prioridade == null ? "NORMAL" : prioridade;
        String motivo = "nível " + nivel + " aplicado a " + horasAtraso + "h de atraso";

        // Escalada: atraso > 24h sobe PERSISTENTE -> INTENSIVA; > 72h -> CRITICA
        if (horasAtraso >= 72) {
            nivel = "CRITICA";
            motivo = "atraso >= 72h: nível escalado para CRITICA";
        } else if (horasAtraso >= 24 && !"CRITICA".equals(nivel)) {
            nivel = "INTENSIVA";
            motivo = "atraso >= 24h: nível escalado para INTENSIVA";
        }

        // Escalada de prioridade por muito atraso
        if (horasAtraso >= 168) {
            prio = "CRITICA";
            motivo = "atraso >= 7d: prioridade CRITICA";
        } else if (horasAtraso >= 72 && !"URGENTE".equals(prio) && !"CRITICA".equals(prio)) {
            prio = "URGENTE";
            motivo = "atraso >= 72h: prioridade URGENTE";
        }

        // Bloqueio automático por muito atraso no nível CRITICA
        boolean bloquear = "CRITICA".equals(nivel) && horasAtraso >= horasAteBloqueio(prio);
        if (bloquear) motivo += " + BLOQUEIO aplicado";

        // Decide se deve notificar agora
        boolean notificar = false;
        if (ultimaCobrancaEm == null) {
            notificar = true; // primeira vez
            motivo += " | primeira cobrança";
        } else {
            long segDesdeUltima = Duration.between(ultimaCobrancaEm, agora).getSeconds();
            if (segDesdeUltima >= intervaloSegundos(nivel)) {
                notificar = true;
                motivo += " | intervalo esgotado (" + segDesdeUltima + "s)";
            }
        }

        // Silenciar fora de horário?
        if (notificar && silenciarForaHorario) {
            int horaAtual = ZonedDateTime.ofInstant(agora, fuso).getHour();
            if (horaAtual < horaInicio || horaAtual >= horaFim) {
                notificar = false;
                motivo += " | silenciado fora de horário (" + horaAtual + "h)";
            }
        }

        long proximaSeg = intervaloSegundos(nivel);
        return new CobrancaDecisao(notificar, proximaSeg, nivel, prio, bloquear, motivo);
    }

    /** Helper de conveniência: silenciar fora de horário checa contra LocalTime. */
    public static boolean emHorarioTrabalho(Instant agora, ZoneId fuso, int horaInicio, int horaFim) {
        int h = ZonedDateTime.ofInstant(agora, fuso).getHour();
        return h >= horaInicio && h < horaFim;
    }

    /** Helper para uso em logs/testes. */
    public static String resumoAtraso(Duration atraso) {
        if (atraso.isNegative() || atraso.isZero()) return "no prazo";
        long min = atraso.toMinutes();
        if (min < 60) return min + "min de atraso";
        long h = min / 60;
        if (h < 24) return h + "h de atraso";
        long d = h / 24;
        return d + "d " + (h % 24) + "h de atraso";
    }

    @SuppressWarnings("unused")
    private static LocalTime unused() { return LocalTime.MIDNIGHT; } // marcador p/ IDE
}
