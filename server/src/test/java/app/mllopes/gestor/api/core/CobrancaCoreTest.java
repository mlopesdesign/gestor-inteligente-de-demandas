package app.mllopes.gestor.api.core;

import app.mllopes.gestor.api.core.CobrancaCore.CobrancaDecisao;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Testes do motor de cobrança contínua (puro).
 * Cobertura mínima: tarefa resolvida, sem vencimento, em dia, atrasada, escalonamento,
 * silenciar fora de horário, bloqueio.
 */
class CobrancaCoreTest {

    private static final ZoneId SP = ZoneId.of("America/Sao_Paulo");
    private final Instant agora = Instant.parse("2026-08-14T13:00:00Z");

    @Test
    void tarefaConcluidaNaoGeraCobranca() {
        CobrancaDecisao d = CobrancaCore.avaliar(
            "CONCLUIDA", "NORMAL", "PERSISTENTE",
            agora.minus(Duration.ofDays(5)), null, agora, SP, 8, 18, false);
        assertFalse(d.notificar(), "Concluída não pode notificar");
        assertEquals(-1, d.proximaCobrancaEmSegundos());
        assertTrue(d.motivo().contains("resolvida"));
    }

    @Test
    void tarefaCanceladaNaoGeraCobranca() {
        CobrancaDecisao d = CobrancaCore.avaliar(
            "CANCELADA", "ALTA", "INTENSIVA",
            agora.minus(Duration.ofDays(10)), null, agora, SP, 8, 18, false);
        assertFalse(d.notificar());
        assertEquals(-1, d.proximaCobrancaEmSegundos());
    }

    @Test
    void semVencimentoNaoCobra() {
        CobrancaDecisao d = CobrancaCore.avaliar(
            "EM_ANDAMENTO", "NORMAL", "PERSISTENTE",
            null, null, agora, SP, 8, 18, false);
        assertFalse(d.notificar());
        assertEquals(-1, d.proximaCobrancaEmSegundos());
    }

    @Test
    void primeiraCobrancaNotificaImediato() {
        CobrancaDecisao d = CobrancaCore.avaliar(
            "EM_ANDAMENTO", "NORMAL", "PERSISTENTE",
            agora.minus(Duration.ofHours(1)), null, agora, SP, 8, 18, false);
        assertTrue(d.notificar(), "Primeira cobrança deve notificar");
        assertEquals(CobrancaCore.intervaloSegundos("PERSISTENTE"), d.proximaCobrancaEmSegundos());
    }

    @Test
    void intervaloRespeitado() {
        CobrancaDecisao d = CobrancaCore.avaliar(
            "EM_ANDAMENTO", "NORMAL", "PERSISTENTE",
            agora.minus(Duration.ofHours(2)),
            agora.minus(Duration.ofMinutes(10)), // 10min atrás — abaixo do intervalo PERSISTENTE (4h)
            agora, SP, 8, 18, false);
        assertFalse(d.notificar(), "Ainda dentro do intervalo de 4h");
    }

    @Test
    void intervaloExcedidoNotifica() {
        CobrancaDecisao d = CobrancaCore.avaliar(
            "EM_ANDAMENTO", "NORMAL", "PERSISTENTE",
            agora.minus(Duration.ofHours(2)),
            agora.minus(Duration.ofHours(5)), // 5h atrás — acima de 4h
            agora, SP, 8, 18, false);
        assertTrue(d.notificar());
    }

    @Test
    void atraso24hEscalaParaIntensiva() {
        CobrancaDecisao d = CobrancaCore.avaliar(
            "EM_ANDAMENTO", "NORMAL", "PERSISTENTE",
            agora.minus(Duration.ofHours(30)), null, agora, SP, 8, 18, false);
        assertEquals("INTENSIVA", d.nivelAplicado(), "30h de atraso deve escalar para INTENSIVA");
        assertEquals(3600L, d.proximaCobrancaEmSegundos());
    }

    @Test
    void atraso72hEscalaParaCriticaEAvisaPrioridade() {
        CobrancaDecisao d = CobrancaCore.avaliar(
            "EM_ANDAMENTO", "NORMAL", "PERSISTENTE",
            agora.minus(Duration.ofHours(80)), null, agora, SP, 8, 18, false);
        assertEquals("CRITICA", d.nivelAplicado());
        assertEquals("URGENTE", d.prioridadeAplicada(), "80h já força URGENTE");
    }

    @Test
    void atraso7dPrioridadeCritica() {
        CobrancaDecisao d = CobrancaCore.avaliar(
            "EM_ANDAMENTO", "ALTA", "CRITICA",
            agora.minus(Duration.ofDays(8)), null, agora, SP, 8, 18, false);
        assertEquals("CRITICA", d.prioridadeAplicada());
    }

    @Test
    void bloqueiaAposHorasLimite() {
        // CRITICA + prioridade URGENTE: bloqueia após 24h de atraso
        CobrancaDecisao d = CobrancaCore.avaliar(
            "EM_ANDAMENTO", "URGENTE", "CRITICA",
            agora.minus(Duration.ofHours(30)), null, agora, SP, 8, 18, false);
        assertTrue(d.bloquear(), "30h atraso em CRITICA + URGENTE deve bloquear");
    }

    @Test
    void naoBloqueiaAntesDoLimite() {
        // NORMAL: 72h
        CobrancaDecisao d = CobrancaCore.avaliar(
            "EM_ANDAMENTO", "NORMAL", "CRITICA",
            agora.minus(Duration.ofHours(40)), null, agora, SP, 8, 18, false);
        assertFalse(d.bloquear(), "40h < 72h limite NORMAL");
    }

    @Test
    void silenciarForaHorario() {
        // Agora 22h em SP, horaInicio 8, horaFim 18, silenciar=true
        Instant tarde = Instant.parse("2026-08-14T22:00:00-03:00");
        CobrancaDecisao d = CobrancaCore.avaliar(
            "EM_ANDAMENTO", "NORMAL", "PERSISTENTE",
            tarde.minus(Duration.ofHours(1)),
            null, tarde, SP, 8, 18, true);
        assertFalse(d.notificar(), "Fora de horário + silenciar=true não pode notificar");
    }

    @Test
    void naoSilenciaDentroDoHorario() {
        Instant manha = Instant.parse("2026-08-14T10:00:00-03:00");
        CobrancaDecisao d = CobrancaCore.avaliar(
            "EM_ANDAMENTO", "NORMAL", "PERSISTENTE",
            manha.minus(Duration.ofHours(1)),
            null, manha, SP, 8, 18, true);
        assertTrue(d.notificar());
    }

    @Test
    void intervaloPorNivel() {
        assertEquals(86400L, CobrancaCore.intervaloSegundos("DISCRETA"));
        assertEquals(14400L, CobrancaCore.intervaloSegundos("PERSISTENTE"));
        assertEquals(3600L, CobrancaCore.intervaloSegundos("INTENSIVA"));
        assertEquals(900L, CobrancaCore.intervaloSegundos("CRITICA"));
        assertEquals(14400L, CobrancaCore.intervaloSegundos(null), "null = PERSISTENTE");
        assertEquals(14400L, CobrancaCore.intervaloSegundos("DESCONHECIDA"), "Desconhecida = PERSISTENTE");
    }

    @Test
    void horasAteBloqueioPorPrioridade() {
        assertEquals(12L, CobrancaCore.horasAteBloqueio("CRITICA"));
        assertEquals(24L, CobrancaCore.horasAteBloqueio("URGENTE"));
        assertEquals(48L, CobrancaCore.horasAteBloqueio("ALTA"));
        assertEquals(72L, CobrancaCore.horasAteBloqueio("NORMAL"));
        assertEquals(168L, CobrancaCore.horasAteBloqueio("BAIXA"));
    }

    @Test
    void resumoAtrasoFormatado() {
        assertEquals("no prazo", CobrancaCore.resumoAtraso(Duration.ofMinutes(-5)));
        assertEquals("30min de atraso", CobrancaCore.resumoAtraso(Duration.ofMinutes(30)));
        assertEquals("5h de atraso", CobrancaCore.resumoAtraso(Duration.ofHours(5)));
        assertEquals("2d 3h de atraso", CobrancaCore.resumoAtraso(Duration.ofHours(51)));
    }

    @Test
    void emHorarioTrabalho() {
        Instant manha = Instant.parse("2026-08-14T10:00:00-03:00");
        Instant tarde = Instant.parse("2026-08-14T22:00:00-03:00");
        assertTrue(CobrancaCore.emHorarioTrabalho(manha, SP, 8, 18));
        assertFalse(CobrancaCore.emHorarioTrabalho(tarde, SP, 8, 18));
    }
}
