package app.mllopes.gestor.api.ai;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Testes do gateway de IA. Como o foco é o fallback e a extração de JSON,
 * não dependemos de chave de API (testes unitários puros).
 */
class AiGatewayTest {

    @Test
    void semChaveNaoEstaDisponivel() {
        AiGateway gw = new AiGateway(null, null);
        assertFalse(gw.disponivel());
    }

    @Test
    void chaveVaziaNaoEstaDisponivel() {
        AiGateway gw = new AiGateway("", "gpt-4o-mini");
        assertFalse(gw.disponivel());
    }

    @Test
    void heuristicaDevolveJsonValido() {
        AiGateway gw = new AiGateway(null, null);
        AiGateway.Resposta r = gw.heuristica("v1/parse-tarefa", "Ligar para o cliente X", "sem chave");
        assertTrue(r.fallback());
        assertNotNull(r.motivoFallback());
        String json = AiGateway.extrairJson(r.conteudo());
        assertNotNull(json);
        assertTrue(json.contains("\"titulo\""), "Deve conter campo titulo");
        assertTrue(json.contains("Ligar para o cliente X"), "Deve ecoar a entrada");
    }

    @Test
    void heuristicaComTextoVazio() {
        AiGateway gw = new AiGateway(null, null);
        AiGateway.Resposta r = gw.heuristica("v1/parse-tarefa", "", "sem chave");
        assertTrue(r.fallback());
        String json = AiGateway.extrairJson(r.conteudo());
        assertNotNull(json);
        assertTrue(json.contains("sem t\u00edtulo") || json.contains("(sem t\u00edtulo)"),
            "Título default quando texto vazio");
    }

    @Test
    void extrairJsonPrimeiroBloco() {
        String txt = "Aqui vai o JSON:\n{\"a\":1,\"b\":2}\nE depois mais texto.";
        String json = AiGateway.extrairJson(txt);
        assertNotNull(json);
        assertEquals("{\"a\":1,\"b\":2}", json);
    }

    @Test
    void extrairJsonTextoSemJsonRetornaNull() {
        String txt = "Apenas texto sem json";
        String json = AiGateway.extrairJson(txt);
        assertNull(json);
    }

    @Test
    void extrairJsonTextoNuloRetornaNull() {
        assertNull(AiGateway.extrairJson(null));
    }

    @Test
    void promptRepositoryCarrega() {
        PromptRepository pr = new PromptRepository();
        String p = pr.carregar("parse-tarefa");
        assertNotNull(p);
        assertFalse(p.isBlank(), "Prompt não pode ser vazio");
        assertTrue(p.contains("JSON"));
    }

    @Test
    void promptRepositoryInexistenteRetornaVazio() {
        PromptRepository pr = new PromptRepository();
        String p = pr.carregar("nao-existe");
        assertEquals("", p);
    }
}
