package app.mllopes.gestor.api.sync;

import app.mllopes.gestor.api.core.SyncCore;
import app.mllopes.gestor.api.core.SyncCore.ResultadoMudanca;
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
 * Serviço de sincronização: processa push (lote de mudanças do cliente),
 * pull (mudanças desde cursor) e detecção de conflito.
 *
 * <p>Idempotente: aplica via {@code sync_mudancas} com UNIQUE
 * (tabela, registro_id, versao) — replays do mesmo push não duplicam.
 */
public final class SyncService {

    private static final Logger LOG = LoggerFactory.getLogger(SyncService.class);

    private final Db db;
    public SyncService(Db db) { this.db = db; }

    /** Resposta do push. */
    public static final class PushResultado {
        public int aplicadas = 0;
        public int conflitos = 0;
        public int idempotentes = 0;
        public List<Map<String, Object>> detalhes = new ArrayList<>();
    }

    public PushResultado push(String usuarioId, String dispositivoId, List<Map<String, Object>> mudancas) {
        PushResultado out = new PushResultado();
        if (mudancas == null || mudancas.isEmpty()) return out;
        for (Map<String, Object> m : mudancas) {
            String tabela = str(m, "tabela");
            String regId = str(m, "registro_id");
            String op = str(m, "operacao");
            long versaoCliente = longOr(m, "versao", 0);
            Object payload = m.get("payload");
            String payloadJson;
            if (payload == null) {
                payloadJson = "{}";
            } else if (payload instanceof String s) {
                payloadJson = s;
            } else {
                try {
                    payloadJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(payload);
                } catch (Exception ex) {
                    payloadJson = "{}";
                }
            }
            if (tabela == null || regId == null || op == null) continue;
            try (Connection c = db.conexao()) {
                long versaoServidor = buscarVersao(c, usuarioId, tabela, regId);
                ResultadoMudanca r = SyncCore.avaliarMudanca(tabela, regId, versaoServidor, versaoCliente);

                if (r.conflito()) {
                    inserirConflito(c, usuarioId, tabela, regId,
                        versaoServidor, versaoCliente, dispositivoId,
                        buscarJson(c, usuarioId, tabela, regId), payloadJson);
                    out.conflitos++;
                    Map<String, Object> det = new LinkedHashMap<>();
                    det.put("tabela", tabela);
                    det.put("registro_id", regId);
                    det.put("estado", "CONFLITO");
                    det.put("motivo", r.motivo());
                    out.detalhes.add(det);
                    continue;
                }
                if (!r.aplicada()) {
                    out.detalhes.add(erroDetalhe(tabela, regId, r.motivo()));
                    continue;
                }
                if ("UPSERT".equals(op)) {
                    if (versaoServidor == 0) {
                        inserirRegistro(c, usuarioId, tabela, regId, versaoCliente, payloadJson);
                    } else {
                        atualizarRegistro(c, usuarioId, tabela, regId, versaoCliente, payloadJson);
                    }
                } else if ("DELETE".equals(op)) {
                    deletarRegistro(c, usuarioId, tabela, regId);
                }
                registrarMudanca(c, usuarioId, dispositivoId, tabela, regId, op, versaoCliente, payloadJson);
                out.aplicadas++;
                Map<String, Object> det = new LinkedHashMap<>();
                det.put("tabela", tabela);
                det.put("registro_id", regId);
                det.put("estado", "OK");
                det.put("versao_servidor", r.versaoServidor());
                out.detalhes.add(det);
            } catch (SQLException e) {
                LOG.error("Falha no push (tabela={}, regId={})", tabela, regId, e);
                out.detalhes.add(erroDetalhe(tabela, regId, e.getMessage()));
            }
        }
        return out;
    }

    public List<Map<String, Object>> pull(String usuarioId, String dispositivoId, long desdeId, int limite) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (limite <= 0 || limite > 1000) limite = 200;
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(
                "SELECT id, tabela, registro_id, operacao, versao, payload_json, criado_em, dispositivo_id " +
                "FROM sync_mudancas WHERE usuario_id = ? AND id > ? " +
                "ORDER BY id ASC LIMIT ?")) {
            ps.setString(1, usuarioId);
            ps.setLong(2, desdeId);
            ps.setInt(3, limite);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("tabela", rs.getString("tabela"));
                    m.put("registro_id", rs.getString("registro_id"));
                    m.put("operacao", rs.getString("operacao"));
                    m.put("versao", rs.getLong("versao"));
                    m.put("payload_json", rs.getString("payload_json"));
                    m.put("criado_em", rs.getString("criado_em"));
                    m.put("dispositivo_origem", rs.getString("dispositivo_id"));
                    out.add(m);
                }
            }
            // Atualiza cursor do dispositivo
            long maior = desdeId;
            for (Map<String, Object> m : out) {
                long id = ((Number) m.get("id")).longValue();
                if (id > maior) maior = id;
            }
            try (PreparedStatement up = c.prepareStatement(
                "INSERT INTO sync_cursores(usuario_id, dispositivo_id, ultimo_id, atualizado_em) " +
                "VALUES (?,?,?,?) " +
                "ON CONFLICT(usuario_id, dispositivo_id) DO UPDATE SET " +
                "ultimo_id = MAX(ultimo_id, excluded.ultimo_id), atualizado_em = excluded.atualizado_em")) {
                up.setString(1, usuarioId);
                up.setString(2, dispositivoId);
                up.setLong(3, maior);
                up.setString(4, Instant.now().toString());
                up.executeUpdate();
            }
        } catch (SQLException e) {
            LOG.error("Falha no pull", e);
        }
        return out;
    }

    public List<Map<String, Object>> listarConflitos(String usuarioId, String estado) {
        List<Map<String, Object>> out = new ArrayList<>();
        StringBuilder sql = new StringBuilder(
            "SELECT id, tabela, registro_id, versao_servidor, versao_cliente_a, " +
            "dispositivo_a_id, estado, criado_em FROM sync_conflitos WHERE usuario_id = ?");
        if (estado != null && !estado.isBlank()) sql.append(" AND estado = ?");
        sql.append(" ORDER BY id DESC LIMIT 200");
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(sql.toString())) {
            ps.setString(1, usuarioId);
            if (estado != null && !estado.isBlank()) ps.setString(2, estado);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("tabela", rs.getString("tabela"));
                    m.put("registro_id", rs.getString("registro_id"));
                    m.put("versao_servidor", rs.getLong("versao_servidor"));
                    m.put("versao_cliente_a", rs.getLong("versao_cliente_a"));
                    m.put("dispositivo_a_id", rs.getString("dispositivo_a_id"));
                    m.put("estado", rs.getString("estado"));
                    m.put("criado_em", rs.getString("criado_em"));
                    out.add(m);
                }
            }
        } catch (SQLException e) {
            LOG.error("Falha ao listar conflitos", e);
        }
        return out;
    }

    public Map<String, Object> buscarConflito(String usuarioId, long id) {
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(
                "SELECT * FROM sync_conflitos WHERE id = ? AND usuario_id = ?")) {
            ps.setLong(1, id);
            ps.setString(2, usuarioId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("tabela", rs.getString("tabela"));
                    m.put("registro_id", rs.getString("registro_id"));
                    m.put("versao_servidor", rs.getLong("versao_servidor"));
                    m.put("versao_cliente_a", rs.getLong("versao_cliente_a"));
                    m.put("dispositivo_a_id", rs.getString("dispositivo_a_id"));
                    m.put("payload_servidor", rs.getString("payload_servidor"));
                    m.put("payload_cliente_a", rs.getString("payload_cliente_a"));
                    m.put("estado", rs.getString("estado"));
                    m.put("criado_em", rs.getString("criado_em"));
                    return m;
                }
            }
        } catch (SQLException e) {
            LOG.error("Falha ao buscar conflito", e);
        }
        return null;
    }

    /** Resolve um conflito manualmente. */
    public boolean resolverConflito(String usuarioId, long id, String escolha, String operadorId) {
        // escolha: MINE | THEIRS | MERGE
        try (Connection c = db.conexao()) {
            Map<String, Object> conflito = buscarConflito(usuarioId, id);
            if (conflito == null) return false;
            String estadoAtual = (String) conflito.get("estado");
            if (!"PENDENTE".equals(estadoAtual)) return false;

            String tabela = (String) conflito.get("tabela");
            String regId = (String) conflito.get("registro_id");
            long vServidor = ((Number) conflito.get("versao_servidor")).longValue();
            String pServidor = (String) conflito.get("payload_servidor");
            String pCliente  = (String) conflito.get("payload_cliente_a");

            String novoEstado;
            String payloadFinal;
            long novaVersao;
            if ("MINE".equalsIgnoreCase(escolha)) {
                novoEstado = "RESOLVIDO_MINE";
                payloadFinal = pCliente;
                novaVersao = vServidor + 1;
                atualizarRegistro(c, usuarioId, tabela, regId, novaVersao, payloadFinal);
            } else if ("THEIRS".equalsIgnoreCase(escolha)) {
                novoEstado = "RESOLVIDO_THEIRS";
                payloadFinal = pServidor;
                novaVersao = vServidor;
                // já está no servidor
            } else if ("MERGE".equalsIgnoreCase(escolha)) {
                novoEstado = "RESOLVIDO_MERGE";
                payloadFinal = mergeJson(pServidor, pCliente);
                novaVersao = vServidor + 1;
                atualizarRegistro(c, usuarioId, tabela, regId, novaVersao, payloadFinal);
            } else {
                return false;
            }

            try (PreparedStatement up = c.prepareStatement(
                "UPDATE sync_conflitos SET estado = ?, escolhido_por = ?, escolhido_em = ? WHERE id = ?")) {
                up.setString(1, novoEstado);
                up.setString(2, operadorId);
                up.setString(3, Instant.now().toString());
                up.setLong(4, id);
                up.executeUpdate();
            }
            // Empurra a mudança resultante para outros dispositivos
            registrarMudanca(c, usuarioId, "__resolucao__", tabela, regId, "UPSERT", novaVersao, payloadFinal);
            return true;
        } catch (SQLException e) {
            LOG.error("Falha ao resolver conflito", e);
            return false;
        }
    }

    private String mergeJson(String a, String b) {
        // Merge simples: cliente sobrescreve servidor campo a campo
        try {
            var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            var ja = mapper.readTree(a == null ? "{}" : a);
            var jb = mapper.readTree(b == null ? "{}" : b);
            var it = jb.fieldNames();
            while (it.hasNext()) {
                String f = it.next();
                ((com.fasterxml.jackson.databind.node.ObjectNode) ja).set(f, jb.get(f));
            }
            return mapper.writeValueAsString(ja);
        } catch (Exception e) {
            return a; // fallback
        }
    }

    // -------- helpers --------

    private long buscarVersao(Connection c, String uid, String tabela, String regId) {
        // Procura em qualquer tabela mapeada
        String t = tabela.toLowerCase();
        if (t.equals("tarefas") || t.equals("areas") || t.equals("clientes") || t.equals("projetos")
                || t.equals("subtarefas") || t.equals("anexos") || t.equals("lembretes")) {
            try (PreparedStatement ps = c.prepareStatement("SELECT versao FROM " + t + " WHERE id = ? AND usuario_id = ?")) {
                ps.setString(1, regId);
                ps.setString(2, uid);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) return rs.getLong(1);
                }
            } catch (SQLException e) { LOG.warn("buscarVersao: {}", e.getMessage()); }
        }
        return 0L;
    }

    private String buscarJson(Connection c, String uid, String tabela, String regId) {
        String t = tabela.toLowerCase();
        if (t.equals("tarefas") || t.equals("areas") || t.equals("clientes") || t.equals("projetos")) {
            try (PreparedStatement ps = c.prepareStatement("SELECT * FROM " + t + " WHERE id = ? AND usuario_id = ?")) {
                ps.setString(1, regId);
                ps.setString(2, uid);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        var md = rs.getMetaData();
                        var map = new LinkedHashMap<String, Object>();
                        for (int i = 1; i <= md.getColumnCount(); i++) map.put(md.getColumnLabel(i), rs.getObject(i));
                        return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(map);
                    }
                }
            } catch (Exception e) { LOG.warn("buscarJson: {}", e.getMessage()); }
        }
        return "{}";
    }

    private void inserirRegistro(Connection c, String uid, String tabela, String regId, long versao, String payloadJson) throws SQLException {
        String t = tabela.toLowerCase();
        // Para simplificar, aceitamos só UPSERT nas tabelas mapeadas com colunas padrão
        if (t.equals("tarefas")) {
            // payload deve ser um JSON com colunas válidas; usamos um INSERT seguro
            try {
                var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(payloadJson);
                try (PreparedStatement ps = c.prepareStatement(
                    "INSERT OR REPLACE INTO tarefas(id, usuario_id, dono_id, titulo, descricao, status, prioridade, nivel_cobranca, criado_em, atualizado_em, versao) " +
                    "VALUES (?,?,?,?,?,?,?,?,?,?,?)")) {
                    ps.setString(1, regId);
                    ps.setString(2, uid);
                    ps.setString(3, uid);
                    ps.setString(4, textOr(node, "titulo", "(sem título)"));
                    ps.setString(5, textOr(node, "descricao", null));
                    ps.setString(6, textOr(node, "status", "CAIXA_ENTRADA"));
                    ps.setString(7, textOr(node, "prioridade", "NORMAL"));
                    ps.setString(8, textOr(node, "nivel_cobranca", "PERSISTENTE"));
                    String agora = Instant.now().toString();
                    ps.setString(9, textOr(node, "criado_em", agora));
                    ps.setString(10, agora);
                    ps.setLong(11, versao);
                    ps.executeUpdate();
                }
            } catch (Exception e) { throw new SQLException("payload inválido: " + e.getMessage(), e); }
        }
        // outras tabelas: no-op neste MVP
    }

    private void atualizarRegistro(Connection c, String uid, String tabela, String regId, long versao, String payloadJson) throws SQLException {
        String t = tabela.toLowerCase();
        if (t.equals("tarefas")) {
            try {
                var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(payloadJson);
                try (PreparedStatement ps = c.prepareStatement(
                    "UPDATE tarefas SET titulo = COALESCE(?, titulo), descricao = COALESCE(?, descricao), " +
                    "status = COALESCE(?, status), prioridade = COALESCE(?, prioridade), " +
                    "nivel_cobranca = COALESCE(?, nivel_cobranca), atualizado_em = ?, versao = ? " +
                    "WHERE id = ? AND usuario_id = ?")) {
                    ps.setString(1, textOr(node, "titulo", null));
                    ps.setString(2, textOr(node, "descricao", null));
                    ps.setString(3, textOr(node, "status", null));
                    ps.setString(4, textOr(node, "prioridade", null));
                    ps.setString(5, textOr(node, "nivel_cobranca", null));
                    ps.setString(6, Instant.now().toString());
                    ps.setLong(7, versao);
                    ps.setString(8, regId);
                    ps.setString(9, uid);
                    ps.executeUpdate();
                }
            } catch (Exception e) { throw new SQLException("payload inválido: " + e.getMessage(), e); }
        }
    }

    private void deletarRegistro(Connection c, String uid, String tabela, String regId) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("DELETE FROM " + tabela.toLowerCase() + " WHERE id = ? AND usuario_id = ?")) {
            ps.setString(1, regId);
            ps.setString(2, uid);
            ps.executeUpdate();
        }
    }

    private void registrarMudanca(Connection c, String uid, String disp, String tabela, String regId,
                                  String op, long versao, String payload) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
            "INSERT OR IGNORE INTO sync_mudancas(usuario_id, dispositivo_id, tabela, registro_id, operacao, versao, payload_json, criado_em) " +
            "VALUES (?,?,?,?,?,?,?,?)")) {
            ps.setString(1, uid);
            ps.setString(2, disp);
            ps.setString(3, tabela);
            ps.setString(4, regId);
            ps.setString(5, op);
            ps.setLong(6, versao);
            ps.setString(7, payload);
            ps.setString(8, Instant.now().toString());
            ps.executeUpdate();
        }
    }

    private void inserirConflito(Connection c, String uid, String tabela, String regId,
                                  long vServidor, long vCliente, String dispA,
                                  String pServidor, String pCliente) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
            "INSERT INTO sync_conflitos(usuario_id, tabela, registro_id, versao_servidor, versao_cliente_a, dispositivo_a_id, payload_servidor, payload_cliente_a, criado_em) " +
            "VALUES (?,?,?,?,?,?,?,?,?)")) {
            ps.setString(1, uid);
            ps.setString(2, tabela);
            ps.setString(3, regId);
            ps.setLong(4, vServidor);
            ps.setLong(5, vCliente);
            ps.setString(6, dispA);
            ps.setString(7, pServidor == null ? "{}" : pServidor);
            ps.setString(8, pCliente == null ? "{}" : pCliente);
            ps.setString(9, Instant.now().toString());
            ps.executeUpdate();
        }
    }

    private static String str(Map<?, ?> m, String k) {
        Object v = m == null ? null : m.get(k);
        return v == null ? null : v.toString();
    }
    private static long longOr(Map<?, ?> m, String k, long def) {
        Object v = m == null ? null : m.get(k);
        if (v == null) return def;
        if (v instanceof Number n) return n.longValue();
        try { return Long.parseLong(v.toString()); } catch (Exception e) { return def; }
    }
    private static Map<String, Object> erroDetalhe(String t, String r, String motivo) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("tabela", t);
        m.put("registro_id", r);
        m.put("estado", "ERRO");
        m.put("motivo", motivo);
        return m;
    }
    private static String textOr(com.fasterxml.jackson.databind.JsonNode n, String f, String def) {
        return n != null && n.has(f) && !n.get(f).isNull() ? n.get(f).asText() : def;
    }
}
