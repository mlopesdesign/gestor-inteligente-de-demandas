package app.mllopes.gestor.api.routes;

import app.mllopes.gestor.api.db.Db;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Teste 3/5 — Db responde a PRAGMA integrity_check (usado por HealthRoute).
 */
class HealthRouteTest {

    @Test
    void integridadeDoBancoEhOk(@TempDir Path tmp) throws Exception {
        Path dbPath = tmp.resolve("health.db");
        Db db = new Db(dbPath.toString());
        db.abrir();
        db.migrar();
        assertTrue(db.integro(), "banco recém-criado deve estar íntegro");

        // Insere uma linha, lê de volta
        try (Connection c = db.conexao(); Statement s = c.createStatement()) {
            s.execute("INSERT INTO usuarios(id,email,senha_hash,nome,dono_id,criado_em,atualizado_em) VALUES ('u1','u1@x.com','h','U1','u1','2026-08-14T00:00:00Z','2026-08-14T00:00:00Z')");
            try (ResultSet rs = s.executeQuery("SELECT email FROM usuarios WHERE id='u1'")) {
                assertTrue(rs.next());
                assertEquals("u1@x.com", rs.getString(1));
            }
        }
        // Fecha explicitamente para liberar o lock do Windows
        db.close();
        // Pequeno delay para o Windows liberar o arquivo
        Thread.sleep(100);
    }
}
