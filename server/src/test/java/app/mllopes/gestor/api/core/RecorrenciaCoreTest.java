package app.mllopes.gestor.api.core;

import app.mllopes.gestor.api.core.RecorrenciaCore.Proxima;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Testes do motor de recorrência (puro). Cobre diária, semanal, mensal, fim, max_ocorrencias.
 */
class RecorrenciaCoreTest {

    private static final ZoneId SP = ZoneId.of("America/Sao_Paulo");
    private final Instant agora = Instant.parse("2026-08-14T13:00:00Z");

    @Test
    void semRecorrenciaJsonNaoGera() {
        Proxima p = RecorrenciaCore.calcular(null, agora, agora, SP, 1);
        assertFalse(p.gerar());
    }

    @Test
    void jsonInvalidoNaoGera() {
        Proxima p = RecorrenciaCore.calcular("nao é json", agora, agora, SP, 1);
        assertFalse(p.gerar());
        assertTrue(p.motivo().contains("JSON inválido"));
    }

    @Test
    void diariaSimplesAvançaUmDia() {
        Proxima p = RecorrenciaCore.calcular(
            "{\"frequencia\":\"DIARIA\",\"intervalo\":1}",
            agora, agora, SP, 1);
        assertTrue(p.gerar());
        assertNotNull(p.novoVencimentoEm());
        // +1 dia = 2026-08-15T13:00Z
        assertEquals(Instant.parse("2026-08-15T13:00:00Z"), p.novoVencimentoEm());
    }

    @Test
    void diariaIntervaloTresDias() {
        Proxima p = RecorrenciaCore.calcular(
            "{\"frequencia\":\"DIARIA\",\"intervalo\":3}",
            agora, agora, SP, 1);
        assertTrue(p.gerar());
        assertEquals(Instant.parse("2026-08-17T13:00:00Z"), p.novoVencimentoEm());
    }

    @Test
    void semanalEmDiaUtil() {
        // hoje é sexta (2026-08-14); dias_semana [1,2,3,4,5] (Seg..Sex)
        // próximo dia útil >= agora deve ser o próximo Seg se a base já passou
        Proxima p = RecorrenciaCore.calcular(
            "{\"frequencia\":\"SEMANAL\",\"intervalo\":1,\"dias_semana\":[1,2,3,4,5]}",
            agora, agora, SP, 1);
        assertTrue(p.gerar());
        assertNotNull(p.novoVencimentoEm());
        // Deve cair numa segunda a sexta
        int dow = p.novoVencimentoEm().atZone(SP).getDayOfWeek().getValue();
        assertTrue(dow >= 1 && dow <= 5, "Dia útil esperado, mas foi ISO=" + dow);
    }

    @Test
    void mensalMantemDiaDoMes() {
        // 14/08 -> próximo dia 14 do próximo mês = 14/09 (clamp se mês menor)
        Proxima p = RecorrenciaCore.calcular(
            "{\"frequencia\":\"MENSAL\",\"intervalo\":1,\"dia_mes\":14}",
            agora, agora, SP, 1);
        assertTrue(p.gerar());
        int novoDia = p.novoVencimentoEm().atZone(SP).getDayOfMonth();
        assertEquals(14, novoDia);
    }

    @Test
    void mensalDia31EmFevereiroFazClamp() {
        // 31/01 -> 28/02 (ou 29 em bissexto)
        Instant base = Instant.parse("2026-01-31T13:00:00Z");
        Proxima p = RecorrenciaCore.calcular(
            "{\"frequencia\":\"MENSAL\",\"intervalo\":1,\"dia_mes\":31}",
            base, agora, SP, 1);
        assertTrue(p.gerar());
        int novoDia = p.novoVencimentoEm().atZone(SP).getDayOfMonth();
        assertTrue(novoDia == 28 || novoDia == 29, "Esperado 28/29, foi " + novoDia);
    }

    @Test
    void respeitaFimEm() {
        Proxima p = RecorrenciaCore.calcular(
            "{\"frequencia\":\"DIARIA\",\"intervalo\":1,\"fim_em\":\"2026-08-15T00:00:00Z\"}",
            agora, agora, SP, 1);
        // próxima seria 15/08 13h, mas fim_em é 15/08 00h, então para
        assertFalse(p.gerar());
        assertTrue(p.motivo().contains("após fim_em"));
    }

    @Test
    void respeitaMaxOcorrencias() {
        Proxima p = RecorrenciaCore.calcular(
            "{\"frequencia\":\"DIARIA\",\"intervalo\":1,\"max_ocorrencias\":3}",
            agora, agora, SP, 5);
        assertFalse(p.gerar());
        assertTrue(p.motivo().contains("max_ocorrencias"));
    }

    @Test
    void manterVencimentoUtilPulaSabadoParaSegunda() {
        // Base = sábado 2026-08-15
        Instant sabado = Instant.parse("2026-08-15T10:00:00-03:00");
        Proxima p = RecorrenciaCore.calcular(
            "{\"frequencia\":\"SEMANAL\",\"intervalo\":1,\"dias_semana\":[6],\"manter_vencimento_util\":true}",
            sabado, sabado, SP, 1);
        // pediria próximo sábado 22/08 mas util=true ajusta p/ segunda 24/08
        assertTrue(p.gerar());
        int dow = p.novoVencimentoEm().atZone(SP).getDayOfWeek().getValue();
        assertEquals(1, dow, "Esperado segunda, foi " + dow);
    }

    @Test
    void clonarCamposExcluiIdentidade() {
        java.util.Map<String, Object> pai = new java.util.LinkedHashMap<>();
        pai.put("id", "01HXX");
        pai.put("versao", 5);
        pai.put("criado_em", "2026-01-01T00:00:00Z");
        pai.put("atualizado_em", "2026-01-01T00:00:00Z");
        pai.put("vencimento_em", "2026-01-01T00:00:00Z");
        pai.put("concluida_em", "2026-01-01T00:00:00Z");
        pai.put("status", "CONCLUIDA");
        pai.put("titulo", "Backup");
        pai.put("descricao", "Diário");
        pai.put("prioridade", "NORMAL");

        java.util.Map<String, Object> clone = RecorrenciaCore.clonarCampos(pai);
        assertEquals(3, clone.size(), "titulo + descricao + prioridade sobrevivem");
        assertTrue(clone.containsKey("titulo"));
        assertTrue(clone.containsKey("descricao"));
        assertTrue(clone.containsKey("prioridade"));
        assertFalse(clone.containsKey("id"));
        assertFalse(clone.containsKey("versao"));
        assertFalse(clone.containsKey("status"));
        assertFalse(clone.containsKey("concluida_em"));
    }
}
