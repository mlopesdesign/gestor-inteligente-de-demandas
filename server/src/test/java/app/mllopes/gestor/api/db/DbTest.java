package app.mllopes.gestor.api.db;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Teste 1/5 — Db abre banco, aplica PRAGMAs e migrations.
 */
class DbTest {

    @Test
    void abreEAplicaPragmasEMigration(@TempDir Path tmp) throws Exception {
        Path dbPath = tmp.resolve("gestor_test.db");
        Db db = new Db(dbPath.toString());
        db.abrir();
        db.migrar();

        // Banco existe
        assertTrue(Files.exists(dbPath), "arquivo de banco deve existir");

        // PRAGMAs aplicados
        try (Connection c = db.conexao(); Statement s = c.createStatement()) {
            try (ResultSet rs = s.executeQuery("PRAGMA journal_mode")) {
                assertTrue(rs.next());
                assertEquals("wal", rs.getString(1).toLowerCase(), "journal_mode deve ser WAL");
            }
            try (ResultSet rs = s.executeQuery("PRAGMA foreign_keys")) {
                assertTrue(rs.next());
                assertEquals("1", rs.getString(1), "foreign_keys deve ser 1");
            }
        }

        // Tabelas da V1 existem
        try (Connection c = db.conexao(); Statement s = c.createStatement();
             ResultSet rs = s.executeQuery("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'")) {
            assertTrue(rs.next(), "tabela usuarios deve existir");
        }

        // Trigger de auditoria append-only ativo
        try (Connection c = db.conexao(); Statement s = c.createStatement()) {
            // Insere um registro primeiro (tabela vazia não dispara trigger)
            s.execute("INSERT INTO auditoria(id, usuario_id, entidade, entidade_id, acao, em) " +
                    "VALUES ('a1','u-test','test','t1','criada','2026-08-14T00:00:00Z')");
            SQLException triggered = assertThrows(SQLException.class, () -> {
                s.execute("DELETE FROM auditoria WHERE id='a1'");
            });
            assertNotNull(triggered.getMessage());
        }

        // Integro
        assertTrue(db.integro(), "banco deve estar íntegro");

        db.close();
    }
}
