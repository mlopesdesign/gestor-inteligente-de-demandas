package app.mllopes.gestor.api.db;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.sql.DataSource;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Wrapper de banco de dados SQLite (Xerial JDBC 3.50+) com pool HikariCP 5
 * e migrações Flyway 10. Usado pelo servidor.
 *
 * <p>Pragmas obrigatórios (ADR 0003 §"Banco central"):
 * <ul>
 *   <li>journal_mode = WAL</li>
 *   <li>foreign_keys = ON</li>
 *   <li>busy_timeout = 5000</li>
 *   <li>synchronous = NORMAL</li>
 *   <li>temp_store = MEMORY</li>
 *   <li>cache_size = -20000 (20 MB)</li>
 * </ul>
 */
public final class Db {

    private static final Logger LOG = LoggerFactory.getLogger(Db.class);

    private final String dbPath;
    private HikariDataSource ds;

    public Db(String dbPath) {
        this.dbPath = dbPath;
    }

    public void abrir() {
        Path p = Path.of(dbPath);
        if (p.getParent() != null) {
            try {
                Files.createDirectories(p.getParent());
            } catch (IOException e) {
                throw new RuntimeException("Não foi possível criar diretório do banco: " + p.getParent(), e);
            }
        }

        HikariConfig cfg = new HikariConfig();
        cfg.setJdbcUrl("jdbc:sqlite:" + dbPath);
        cfg.setDriverClassName("org.sqlite.JDBC");
        cfg.setMaximumPoolSize(10);
        cfg.setMinimumIdle(1);
        cfg.setPoolName("gestor-central-pool");
        cfg.setConnectionTestQuery("PRAGMA foreign_keys");
        // Aplica PRAGMAs em toda conexão (Hikari 5.x: connectionInitSql roda em cada nova conexão)
        cfg.setConnectionInitSql(
            "PRAGMA foreign_keys=ON;" +
            "PRAGMA busy_timeout=5000;" +
            "PRAGMA synchronous=NORMAL;" +
            "PRAGMA temp_store=MEMORY;" +
            "PRAGMA cache_size=-20000;"
        );
        this.ds = new HikariDataSource(cfg);

        // WAL precisa ser aplicado por sessão (afeta todo o banco, não por conexão)
        try (Connection c = ds.getConnection(); Statement s = c.createStatement()) {
            s.execute("PRAGMA journal_mode=WAL");
        } catch (Exception e) {
            LOG.warn("Não foi possível aplicar WAL", e);
        }

        LOG.info("Banco central aberto em {}", dbPath);
    }

    public void migrar() {
        if (ds == null) abrir();
        try {
            Flyway flyway = Flyway.configure()
                    .dataSource(ds)
                    .locations("classpath:db/migration")
                    .baselineOnMigrate(true)
                    .load();
            int applied = flyway.migrate().migrationsExecuted;
            LOG.info("Flyway aplicou {} migration(s)", applied);
        } catch (Exception e) {
            throw new RuntimeException("Falha na migração Flyway", e);
        }
    }

    public DataSource dataSource() {
        if (ds == null) abrir();
        return ds;
    }

    public Connection conexao() throws SQLException {
        if (ds == null) abrir();
        return ds.getConnection();
    }

    public void close() {
        if (ds != null && !ds.isClosed()) {
            LOG.info("Fechando pool do banco central");
            ds.close();
        }
    }

    /** Valida integridade do banco. */
    public boolean integro() {
        try (Connection c = conexao(); Statement s = c.createStatement();
             var rs = s.executeQuery("PRAGMA integrity_check")) {
            return rs.next() && "ok".equalsIgnoreCase(rs.getString(1));
        } catch (SQLException e) {
            LOG.error("Falha ao checar integridade do banco", e);
            return false;
        }
    }
}
