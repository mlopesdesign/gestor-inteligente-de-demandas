package app.mllopes.gestor.api.core;

import app.mllopes.gestor.api.db.Db;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Utilitário genérico de CRUD para tabelas simples.
 * Para entidades com invariantes complexas (tarefas com transição de status,
 * subtarefas, dependências), criar uma classe dedicada em core/.
 */
public final class Crud {

    private static final Logger LOG = LoggerFactory.getLogger(Crud.class);

    private final Db db;
    private final String tabela;
    private final List<String> colunas;

    public Crud(Db db, String tabela, List<String> colunas) {
        this.db = db;
        this.tabela = tabela;
        this.colunas = List.copyOf(colunas);
    }

    public List<Map<String, Object>> listar(String usuarioId) {
        List<Map<String, Object>> out = new ArrayList<>();
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement("SELECT * FROM " + tabela + " WHERE usuario_id = ? ORDER BY atualizado_em DESC")) {
            ps.setString(1, usuarioId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) out.add(rowToMap(rs));
            }
        } catch (SQLException e) {
            LOG.error("Falha ao listar " + tabela, e);
        }
        return out;
    }

    public Map<String, Object> buscar(String usuarioId, String id) {
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement("SELECT * FROM " + tabela + " WHERE id = ? AND usuario_id = ?")) {
            ps.setString(1, id);
            ps.setString(2, usuarioId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) return rowToMap(rs);
            }
        } catch (SQLException e) {
            LOG.error("Falha ao buscar " + tabela + " " + id, e);
        }
        return null;
    }

    public String criar(String usuarioId, Map<String, Object> dados) {
        String id = UlidGen.novo();
        String agora = Instant.now().toString();
        StringBuilder cols = new StringBuilder("id, usuario_id, dono_id, criado_em, atualizado_em, versao");
        StringBuilder placeholders = new StringBuilder("?,?,?,?,?,1");
        java.util.List<Object> valores = new java.util.ArrayList<>();
        valores.add(id);
        valores.add(usuarioId);
        valores.add(usuarioId);
        valores.add(agora);
        valores.add(agora);
        for (String col : colunas) {
            if (!dados.containsKey(col)) continue;
            cols.append(", ").append(col);
            placeholders.append(", ?");
            valores.add(dados.get(col));
        }
        String sql = "INSERT INTO " + tabela + " (" + cols + ") VALUES (" + placeholders + ")";
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(sql)) {
            for (int i = 0; i < valores.size(); i++) {
                ps.setObject(i + 1, valores.get(i));
            }
            ps.executeUpdate();
            return id;
        } catch (SQLException e) {
            LOG.error("Falha ao criar " + tabela, e);
            throw new RuntimeException("Falha ao criar " + tabela + ": " + e.getMessage(), e);
        }
    }

    public boolean atualizar(String usuarioId, String id, int versaoEsperada, Map<String, Object> dados) {
        if (dados.isEmpty()) return true;
        // Constrói UPDATE com WHERE versao = ?
        StringBuilder sql = new StringBuilder("UPDATE " + tabela + " SET ");
        java.util.List<String> sets = new java.util.ArrayList<>();
        java.util.List<Object> valores = new java.util.ArrayList<>();
        for (String col : colunas) {
            if (dados.containsKey(col)) {
                sets.add(col + " = ?");
                valores.add(dados.get(col));
            }
        }
        if (sets.isEmpty()) return true;
        // sempre atualiza atualizado_em e versao
        sets.add("atualizado_em = ?");
        valores.add(Instant.now().toString());
        sets.add("versao = versao + 1");
        sql.append(String.join(", ", sets));
        sql.append(" WHERE id = ? AND usuario_id = ? AND versao = ?");
        valores.add(id);
        valores.add(usuarioId);
        valores.add(versaoEsperada);
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(sql.toString())) {
            for (int i = 0; i < valores.size(); i++) {
                ps.setObject(i + 1, valores.get(i));
            }
            int n = ps.executeUpdate();
            return n > 0;
        } catch (SQLException e) {
            LOG.error("Falha ao atualizar " + tabela + " " + id, e);
            throw new RuntimeException("Falha ao atualizar " + tabela + ": " + e.getMessage(), e);
        }
    }

    public boolean deletar(String usuarioId, String id) {
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement("DELETE FROM " + tabela + " WHERE id = ? AND usuario_id = ?")) {
            ps.setString(1, id);
            ps.setString(2, usuarioId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            LOG.error("Falha ao deletar " + tabela + " " + id, e);
            return false;
        }
    }

    private Map<String, Object> rowToMap(ResultSet rs) throws SQLException {
        Map<String, Object> m = new LinkedHashMap<>();
        var md = rs.getMetaData();
        int n = md.getColumnCount();
        for (int i = 1; i <= n; i++) {
            m.put(md.getColumnLabel(i).toLowerCase(), rs.getObject(i));
        }
        return m;
    }
}
