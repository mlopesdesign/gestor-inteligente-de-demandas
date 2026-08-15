package app.mllopes.gestor.api.auth;

import app.mllopes.gestor.api.core.UlidGen;
import app.mllopes.gestor.api.db.Db;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Sessões server-side: token opaco, armazenamos apenas o SHA-256.
 * Cookie httpOnly+SameSite=Lax no client.
 */
public final class SessionService {

    private static final Logger LOG = LoggerFactory.getLogger(SessionService.class);
    private static final SecureRandom RNG = new SecureRandom();
    private static final long DURACAO_HORAS = 24;
    public static final String COOKIE = "gestor_sessao";

    private final Db db;

    public SessionService(Db db) {
        this.db = db;
    }

    public static String novoToken() {
        byte[] b = new byte[32];
        RNG.nextBytes(b);
        StringBuilder sb = new StringBuilder();
        for (byte v : b) sb.append(String.format("%02x", v));
        return sb.toString();
    }

    public static String hashToken(String token) {
        try {
            var md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte v : digest) sb.append(String.format("%02x", v));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public Sessao criar(String usuarioId, String dispositivoId) {
        String token = novoToken();
        String id = UlidGen.novo();
        Instant agora = Instant.now();
        Instant expira = agora.plus(DURACAO_HORAS, ChronoUnit.HOURS);
        String tokenHash = hashToken(token);
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement("INSERT INTO sessoes(id, usuario_id, token_hash, criada_em, expira_em, dispositivo_id) VALUES (?,?,?,?,?,?)")) {
            ps.setString(1, id);
            ps.setString(2, usuarioId);
            ps.setString(3, tokenHash);
            ps.setString(4, agora.toString());
            ps.setString(5, expira.toString());
            ps.setString(6, dispositivoId);
            ps.executeUpdate();
            return new Sessao(id, token, usuarioId, dispositivoId, expira);
        } catch (SQLException e) {
            throw new RuntimeException("Falha ao criar sessão", e);
        }
    }

    public Sessao buscar(String token) {
        if (token == null || token.isBlank()) return null;
        String tokenHash = hashToken(token);
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(
                "SELECT s.id, s.usuario_id, s.expira_em, s.revogada_em, s.dispositivo_id, u.email, u.nome FROM sessoes s JOIN usuarios u ON s.usuario_id = u.id WHERE s.token_hash = ?")) {
            ps.setString(1, tokenHash);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;
                String id = rs.getString("id");
                String uid = rs.getString("usuario_id");
                String exp = rs.getString("expira_em");
                String rev = rs.getString("revogada_em");
                String did = rs.getString("dispositivo_id");
                String email = rs.getString("email");
                String nome = rs.getString("nome");
                if (rev != null) return null;
                if (Instant.parse(exp).isBefore(Instant.now())) return null;
                return new Sessao(id, token, uid, did, Instant.parse(exp), email, nome);
            }
        } catch (SQLException e) {
            LOG.error("Falha ao buscar sessão", e);
            return null;
        }
    }

    public void revogar(String id) {
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement("UPDATE sessoes SET revogada_em = ? WHERE id = ?")) {
            ps.setString(1, Instant.now().toString());
            ps.setString(2, id);
            ps.executeUpdate();
        } catch (SQLException e) {
            LOG.error("Falha ao revogar sessão " + id, e);
        }
    }

    public void revogarPorDispositivo(String dispositivoId) {
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement("UPDATE sessoes SET revogada_em = ? WHERE dispositivo_id = ? AND revogada_em IS NULL")) {
            ps.setString(1, Instant.now().toString());
            ps.setString(2, dispositivoId);
            ps.executeUpdate();
        } catch (SQLException e) {
            LOG.error("Falha ao revogar sessões do dispositivo " + dispositivoId, e);
        }
    }

    public record Sessao(String id, String token, String usuarioId, String dispositivoId, Instant expiraEm) {
        public Sessao(String id, String token, String usuarioId, String dispositivoId, Instant expiraEm, String email, String nome) {
            this(id, token, usuarioId, dispositivoId, expiraEm);
        }
    }
}
