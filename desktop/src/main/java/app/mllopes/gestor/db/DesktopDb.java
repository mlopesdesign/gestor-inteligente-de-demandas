package app.mllopes.gestor.db;

import org.slf4j.Logger;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Banco local SQLite (Xerial SQLite JDBC 3.50+).
 * Caminho: {@code %APPDATA%/GestorInteligenteDeDemandas/gestor_local.db}
 *
 * <p>Conforme ADR 0003 §"Banco local (cliente)":
 * <ul>
 *   <li>WAL + foreign_keys + busy_timeout</li>
 *   <li>Operação: connection direta (single-thread no desktop)</li>
 *   <li>Recuperação automática a partir de .old ou .tmp se principal faltar</li>
 * </ul>
 */
public final class DesktopDb {

    private static final Logger LOG = org.slf4j.LoggerFactory.getLogger(DesktopDb.class);

    private final Path dbPath;

    public DesktopDb(Path dbPath) {
        this.dbPath = dbPath;
    }

    public void abrir() {
        try {
            Files.createDirectories(dbPath.getParent());
            Class.forName("org.sqlite.JDBC");
            // Recuperação: se faltar o principal, tenta .old e .tmp
            if (!Files.exists(dbPath)) {
                Path old = sibling(".old");
                Path tmp = sibling(".tmp");
                if (Files.exists(old)) {
                    LOG.warn("Banco principal faltando; restaurando de .old");
                    Files.move(old, dbPath);
                } else if (Files.exists(tmp)) {
                    LOG.warn("Banco principal faltando; restaurando de .tmp");
                    Files.move(tmp, dbPath);
                }
            }
            try (Connection c = conexao(); Statement s = c.createStatement()) {
                s.execute("PRAGMA journal_mode=WAL");
                s.execute("PRAGMA foreign_keys=ON");
                s.execute("PRAGMA busy_timeout=5000");
                s.execute("PRAGMA synchronous=NORMAL");
                s.execute("PRAGMA temp_store=MEMORY");
                s.execute("PRAGMA cache_size=-20000");
            }
            LOG.info("Banco local aberto em {}", dbPath);
        } catch (Exception e) {
            throw new RuntimeException("Falha ao abrir banco local: " + dbPath, e);
        }
    }

    public Connection conexao() throws SQLException {
        return DriverManager.getConnection("jdbc:sqlite:" + dbPath.toAbsolutePath());
    }

    public String versaoSqlite() {
        try (Connection c = conexao(); Statement s = c.createStatement();
             var rs = s.executeQuery("SELECT sqlite_version()")) {
            return rs.next() ? rs.getString(1) : "?";
        } catch (Exception e) {
            return "? (" + e.getClass().getSimpleName() + ")";
        }
    }

    public boolean integro() {
        try (Connection c = conexao(); Statement s = c.createStatement();
             var rs = s.executeQuery("PRAGMA integrity_check")) {
            return rs.next() && "ok".equalsIgnoreCase(rs.getString(1));
        } catch (Exception e) {
            LOG.error("Falha na checagem de integridade", e);
            return false;
        }
    }

    public void close() {
        // sql.js: Xerial JDBC fecha via DriverManager
        LOG.info("Fechando banco local {}", dbPath);
    }

    private Path sibling(String suffix) {
        String n = dbPath.getFileName().toString();
        return dbPath.getParent().resolve(n + suffix);
    }
}
