package app.mllopes.gestor.api.core;

import app.mllopes.gestor.api.core.SyncCore.Merge;
import app.mllopes.gestor.api.core.SyncCore.ResultadoMudanca;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Testes do core de sincronização. Cobre a matriz de decisão push e o merge de campos.
 * Os efeitos colaterais no banco (inserts, conflitos) são testados indiretamente
 * via smoke do SyncService em integração.
 */
class SyncCoreTest {

    @Test
    void primeiraEscritaAplica() {
        ResultadoMudanca r = SyncCore.avaliarMudanca("tarefas", "01HXX", 0, 1);
        assertTrue(r.aplicada());
        assertFalse(r.conflito());
        assertEquals(1, r.versaoServidor());
    }

    @Test
    void versaoClienteMaiorAplica() {
        ResultadoMudanca r = SyncCore.avaliarMudanca("tarefas", "01HXX", 3, 5);
        assertTrue(r.aplicada());
        assertFalse(r.conflito());
        assertEquals(5, r.versaoServidor());
    }

    @Test
    void versaoIgualIdempotente() {
        ResultadoMudanca r = SyncCore.avaliarMudanca("tarefas", "01HXX", 4, 4);
        assertTrue(r.aplicada(), "Idempotente é considerada aplicada (sem mudança)");
        assertFalse(r.conflito());
        assertEquals(4, r.versaoServidor());
        assertTrue(r.motivo().contains("idempotente"));
    }

    @Test
    void versaoClienteAtrasadaGeraConflito() {
        ResultadoMudanca r = SyncCore.avaliarMudanca("tarefas", "01HXX", 5, 3);
        assertFalse(r.aplicada(), "Versão atrasada NÃO pode sobrescrever silenciosamente");
        assertTrue(r.conflito());
        assertEquals(5, r.versaoServidor());
        assertTrue(r.motivo().contains("conflito"));
    }

    @Test
    void versaoClienteInvalidaRejeitada() {
        ResultadoMudanca r = SyncCore.avaliarMudanca("tarefas", "01HXX", 5, 0);
        assertFalse(r.aplicada());
        assertFalse(r.conflito());
        assertTrue(r.motivo().contains("inválida"));
    }

    @Test
    void mergeCamposDistintos() throws Exception {
        var mapper = new ObjectMapper();
        var servidor = mapper.readTree("{\"titulo\":\"A\",\"status\":\"CONCLUIDA\"}");
        var cliente  = mapper.readTree("{\"titulo\":\"B\",\"descricao\":\"X\"}");
        Merge m = SyncCore.merge(mapper, servidor, cliente);
        assertTrue(m.servidorGanhou.contains("status"), "status só no servidor");
        assertTrue(m.clienteGanhou.contains("descricao"), "descricao só no cliente");
        // titulo está em ambos mas com valores diferentes => vai pra servidorGanhou
        assertTrue(m.servidorGanhou.contains("titulo"), "titulo divergente vai pro servidor");
        assertEquals(0, m.iguais.size(), "nenhum campo igual");
    }

    @Test
    void mergeServidorNulo() throws Exception {
        var mapper = new ObjectMapper();
        var cliente = mapper.readTree("{\"titulo\":\"X\"}");
        Merge m = SyncCore.merge(mapper, null, cliente);
        assertEquals(1, m.clienteGanhou.size());
        assertEquals(0, m.servidorGanhou.size());
    }

    @Test
    void mergeClienteNulo() throws Exception {
        var mapper = new ObjectMapper();
        var servidor = mapper.readTree("{\"titulo\":\"X\",\"status\":\"OK\"}");
        Merge m = SyncCore.merge(mapper, servidor, null);
        assertEquals(2, m.servidorGanhou.size());
        assertEquals(0, m.clienteGanhou.size());
    }
}
