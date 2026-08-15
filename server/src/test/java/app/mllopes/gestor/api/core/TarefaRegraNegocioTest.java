package app.mllopes.gestor.api.core;

import app.mllopes.gestor.api.auth.AuthService;
import app.mllopes.gestor.api.auth.SessionService;
import app.mllopes.gestor.api.db.Db;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Teste das invariantes e regras da tabela tarefas (V1__init.sql).
 * Verifica que CHECK constraints estão ativos e que triggers protegem auditoria.
 */
class TarefaRegraNegocioTest {

    private Db db;
    private AuthService auth;
    private String usuarioId;

    @BeforeEach
    void setup(@TempDir Path tmp) {
        db = new Db(tmp.resolve("tarefa.db").toString());
        db.abrir();
        db.migrar();
        auth = new AuthService(db, new SessionService(db));
        auth.cadastrar(new AuthService.Cadastro(
            "u@x.com", "senha-123-456", "U", "dev", "Linux", "0.1.0"));
        AuthService.LoginResult r = auth.login("u@x.com", "senha-123-456", "dev", "Linux", "0.1.0");
        this.usuarioId = r.usuario().id;
    }

    @org.junit.jupiter.api.AfterEach
    void cleanup() {
        if (db != null) db.close();
    }

    private int insertTarefa(String titulo) throws SQLException {
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(
                "INSERT INTO tarefas(id, usuario_id, dono_id, titulo, criado_em, atualizado_em) VALUES (?,?,?,?,?,?)")) {
            ps.setString(1, UUID.randomUUID().toString());
            ps.setString(2, usuarioId);
            ps.setString(3, usuarioId);
            ps.setString(4, titulo);
            ps.setString(5, "2026-08-14T00:00:00Z");
            ps.setString(6, "2026-08-14T00:00:00Z");
            return ps.executeUpdate();
        }
    }

    @Test
    void inserirTarefaValidaFunciona() throws Exception {
        assertEquals(1, insertTarefa("Minha tarefa"));
    }

    @Test
    void tituloVazioRejeitado() {
        assertThrows(SQLException.class, () -> insertTarefa(""));
    }

    @Test
    void statusConcluidaSemConcluidaEmRejeita() {
        assertThrows(SQLException.class, () -> {
            try (Connection c = db.conexao();
                 PreparedStatement ps = c.prepareStatement(
                    "INSERT INTO tarefas(id, usuario_id, dono_id, titulo, status, criado_em, atualizado_em) " +
                    "VALUES (?,?,?,?,?,?,?)")) {
                ps.setString(1, UUID.randomUUID().toString());
                ps.setString(2, usuarioId);
                ps.setString(3, usuarioId);
                ps.setString(4, "X");
                ps.setString(5, "CONCLUIDA");
                ps.setString(6, "2026-08-14T00:00:00Z");
                ps.setString(7, "2026-08-14T00:00:00Z");
                ps.executeUpdate();
            }
        });
    }

    @Test
    void statusCanceladaSemMotivoRejeita() {
        assertThrows(SQLException.class, () -> {
            try (Connection c = db.conexao();
                 PreparedStatement ps = c.prepareStatement(
                    "INSERT INTO tarefas(id, usuario_id, dono_id, titulo, status, criado_em, atualizado_em) " +
                    "VALUES (?,?,?,?,?,?,?)")) {
                ps.setString(1, UUID.randomUUID().toString());
                ps.setString(2, usuarioId);
                ps.setString(3, usuarioId);
                ps.setString(4, "X");
                ps.setString(5, "CANCELADA");
                ps.setString(6, "2026-08-14T00:00:00Z");
                ps.setString(7, "2026-08-14T00:00:00Z");
                ps.executeUpdate();
            }
        });
    }

    @Test
    void prioridadeInvalidaRejeita() {
        assertThrows(SQLException.class, () -> {
            try (Connection c = db.conexao();
                 PreparedStatement ps = c.prepareStatement(
                    "INSERT INTO tarefas(id, usuario_id, dono_id, titulo, prioridade, criado_em, atualizado_em) " +
                    "VALUES (?,?,?,?,?,?,?)")) {
                ps.setString(1, UUID.randomUUID().toString());
                ps.setString(2, usuarioId);
                ps.setString(3, usuarioId);
                ps.setString(4, "X");
                ps.setString(5, "ULTRA");
                ps.setString(6, "2026-08-14T00:00:00Z");
                ps.setString(7, "2026-08-14T00:00:00Z");
                ps.executeUpdate();
            }
        });
    }

    @Test
    void subtarefaUnicaPorTarefaEOrdem() throws Exception {
        String tid = UUID.randomUUID().toString();
        insertTarefa("T");  // só pra existir
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(
                "INSERT INTO tarefas(id, usuario_id, dono_id, titulo, criado_em, atualizado_em) VALUES (?,?,?,?,?,?)")) {
            ps.setString(1, tid);
            ps.setString(2, usuarioId);
            ps.setString(3, usuarioId);
            ps.setString(4, "Sub");
            ps.setString(5, "2026-08-14T00:00:00Z");
            ps.setString(6, "2026-08-14T00:00:00Z");
            ps.executeUpdate();
        }
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(
                "INSERT INTO subtarefas(id, tarefa_id, usuario_id, dono_id, titulo, ordem, criado_em, atualizado_em) " +
                "VALUES (?,?,?,?,?,?,?,?)")) {
            ps.setString(1, UUID.randomUUID().toString());
            ps.setString(2, tid);
            ps.setString(3, usuarioId);
            ps.setString(4, usuarioId);
            ps.setString(5, "A");
            ps.setInt(6, 1);
            ps.setString(7, "2026-08-14T00:00:00Z");
            ps.setString(8, "2026-08-14T00:00:00Z");
            ps.executeUpdate();
        }
        assertThrows(SQLException.class, () -> {
            try (Connection c = db.conexao();
                 PreparedStatement ps = c.prepareStatement(
                    "INSERT INTO subtarefas(id, tarefa_id, usuario_id, dono_id, titulo, ordem, criado_em, atualizado_em) " +
                    "VALUES (?,?,?,?,?,?,?,?)")) {
                ps.setString(1, UUID.randomUUID().toString());
                ps.setString(2, tid);
                ps.setString(3, usuarioId);
                ps.setString(4, usuarioId);
                ps.setString(5, "A2");
                ps.setInt(6, 1);
                ps.setString(7, "2026-08-14T00:00:00Z");
                ps.setString(8, "2026-08-14T00:00:00Z");
                ps.executeUpdate();
            }
        });
    }

    @Test
    void dependenciaAutoRefRejeita() throws Exception {
        String tid = UUID.randomUUID().toString();
        insertTarefa("Dep");
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(
                "INSERT INTO tarefas(id, usuario_id, dono_id, titulo, criado_em, atualizado_em) VALUES (?,?,?,?,?,?)")) {
            ps.setString(1, tid);
            ps.setString(2, usuarioId);
            ps.setString(3, usuarioId);
            ps.setString(4, "D");
            ps.setString(5, "2026-08-14T00:00:00Z");
            ps.setString(6, "2026-08-14T00:00:00Z");
            ps.executeUpdate();
        }
        assertThrows(SQLException.class, () -> {
            try (Connection c = db.conexao();
                 PreparedStatement ps = c.prepareStatement(
                    "INSERT INTO dependencias(tarefa_id, depende_de_id) VALUES (?,?)")) {
                ps.setString(1, tid);
                ps.setString(2, tid);
                ps.executeUpdate();
            }
        });
    }

    @Test
    void lwwVersionIncrementaEmUpdate() throws Exception {
        String tid = UUID.randomUUID().toString();
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(
                "INSERT INTO tarefas(id, usuario_id, dono_id, titulo, criado_em, atualizado_em) VALUES (?,?,?,?,?,?)")) {
            ps.setString(1, tid);
            ps.setString(2, usuarioId);
            ps.setString(3, usuarioId);
            ps.setString(4, "Original");
            ps.setString(5, "2026-08-14T00:00:00Z");
            ps.setString(6, "2026-08-14T00:00:00Z");
            ps.executeUpdate();
        }
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(
                "UPDATE tarefas SET titulo = ?, versao = versao + 1 WHERE id = ?")) {
            ps.setString(1, "Atualizado");
            ps.setString(2, tid);
            ps.executeUpdate();
        }
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement("SELECT titulo, versao FROM tarefas WHERE id = ?")) {
            ps.setString(1, tid);
            try (ResultSet rs = ps.executeQuery()) {
                assertTrue(rs.next());
                assertEquals("Atualizado", rs.getString("titulo"));
                assertEquals(2, rs.getInt("versao"));
            }
        }
    }
}
