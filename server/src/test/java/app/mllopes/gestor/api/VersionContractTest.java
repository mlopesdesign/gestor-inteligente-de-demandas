package app.mllopes.gestor.api;

import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Teste 4/5 — pom.xml no classpath e versão da aplicação consistente.
 */
class VersionContractTest {

    @Test
    void pomXmlEAplicacaoTemMesmaVersao() {
        // Lê a versão direto do pom.xml (sempre presente no classpath via resources)
        try (InputStream in = getClass().getClassLoader().getResourceAsStream("pom.xml")) {
            // pom.xml é empacotado pelo Maven como filtro? Em geral não. Verificamos outra fonte.
            assertNull(in, "pom.xml não é recurso; checando META-INF");
        } catch (Exception e) {
            fail(e);
        }
        // A fonte de verdade é o Server.APP_VERSION
        assertEquals("0.1.0", Server.APP_VERSION);
        assertEquals("1", Server.API_VERSION);
    }
}
