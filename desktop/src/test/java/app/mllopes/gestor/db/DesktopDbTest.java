package app.mllopes.gestor.db;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Smoke test do desktop — DesktopDb abre, aplica PRAGMAs, integra.
 * Substitui o smoke E2E JavaFX (que requer display).
 */
class DesktopDbTest {

    @Test
    void abreEAplicaPragmas(@TempDir Path tmp) throws Exception {
        Path dbPath = tmp.resolve("gestor_local.db");
        DesktopDb db = new DesktopDb(dbPath);
        db.abrir();

        assertTrue(Files.exists(dbPath));
        assertTrue(db.integro());

        try (Connection c = db.conexao(); Statement s = c.createStatement();
             ResultSet rs = s.executeQuery("PRAGMA journal_mode")) {
            assertTrue(rs.next());
            assertEquals("wal", rs.getString(1).toLowerCase());
        }

        // SQLite responde
        String v = db.versaoSqlite();
        assertNotNull(v);
        assertTrue(v.length() > 0);
    }
}
