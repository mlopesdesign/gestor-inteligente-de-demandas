package app.mllopes.gestor.core;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * Regras puras de tarefa (parte desktop). Espelha o CobrancaCore do servidor
 * para uso offline (offline-first, AGENTS §4.4).
 */
public final class TarefaCore {

    private TarefaCore() {}

    /** Resumo visual para a UI: status + atraso formatado. */
    public static String resumo(String status, Instant vencimento, Instant agora) {
        StringBuilder sb = new StringBuilder();
        sb.append(status == null ? "?" : status);
        if (vencimento != null) {
            Duration d = Duration.between(vencimento, agora);
            if (d.isNegative() || d.isZero()) {
                sb.append(" · no prazo");
            } else {
                long h = d.toHours();
                if (h < 24) sb.append(" · ").append(h).append("h de atraso");
                else sb.append(" · ").append(h / 24).append("d ").append(h % 24).append("h de atraso");
            }
        }
        return sb.toString();
    }

    /** Cor de badge por prioridade. */
    public static String corPrioridade(String p) {
        if (p == null) return "#888";
        return switch (p) {
            case "BAIXA"    -> "#4caf50";
            case "NORMAL"   -> "#2196f3";
            case "ALTA"     -> "#ff9800";
            case "URGENTE"  -> "#f44336";
            case "CRITICA"  -> "#b71c1c";
            default         -> "#888";
        };
    }

    /** Cor por nível de cobrança. */
    public static String corNivel(String n) {
        if (n == null) return "#888";
        return switch (n) {
            case "DISCRETA"    -> "#9e9e9e";
            case "PERSISTENTE" -> "#03a9f4";
            case "INTENSIVA"   -> "#ff9800";
            case "CRITICA"     -> "#b71c1c";
            default            -> "#888";
        };
    }

    /** Texto curto "vencimento em X" / "há X" para a coluna Vencimento. */
    public static String vencimentoRelativo(Instant venc, Instant agora, ZoneId fuso) {
        if (venc == null) return "—";
        Duration d = Duration.between(agora, venc);
        if (d.isNegative()) {
            long h = -d.toHours();
            if (h < 1) return "há " + (-d.toMinutes()) + "min";
            if (h < 24) return "há " + h + "h";
            return "há " + (h / 24) + "d";
        }
        if (d.toMinutes() < 60) return "em " + d.toMinutes() + "min";
        long h = d.toHours();
        if (h < 24) return "em " + h + "h";
        return "em " + (h / 24) + "d";
    }

    /** Dia local (SP) formatado, p/ "Hoje, 14/08". */
    public static String hojeFormatado(Instant agora, ZoneId fuso) {
        ZonedDateTime z = agora.atZone(fuso);
        return String.format("Hoje, %02d/%02d/%d", z.getDayOfMonth(), z.getMonthValue(), z.getYear());
    }
}
