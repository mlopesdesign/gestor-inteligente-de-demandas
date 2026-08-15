package app.mllopes.gestor.api.auth;

import app.mllopes.gestor.api.core.UlidGen;
import app.mllopes.gestor.api.db.Db;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;

/**
 * Auth: cadastro, login, registro automático de dispositivo.
 * Validação de email por regex; hash via PasswordHasher (argon2id).
 */
public final class AuthService {

    private static final Logger LOG = LoggerFactory.getLogger(AuthService.class);
    private static final String EMAIL_REGEX = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";

    private final Db db;
    private final SessionService sessionService;

    public AuthService(Db db, SessionService sessionService) {
        this.db = db;
        this.sessionService = sessionService;
    }

    public static class Usuario {
        public final String id;
        public final String email;
        public final String nome;
        public final String fuso;
        public final boolean iaHabilitada;
        public Usuario(String id, String email, String nome, String fuso, boolean ia) {
            this.id = id; this.email = email; this.nome = nome; this.fuso = fuso; this.iaHabilitada = ia;
        }
    }

    public static class Dispositivo {
        public final String id;
        public final String nome;
        public final String sistema;
        public final String appVersao;
        public Dispositivo(String id, String nome, String sistema, String appVersao) {
            this.id = id; this.nome = nome; this.sistema = sistema; this.appVersao = appVersao;
        }
    }

    public record Cadastro(String email, String senha, String nome, String dispositivoNome, String sistema, String appVersao) {}

    public record LoginResult(Usuario usuario, SessionService.Sessao sessao) {}

    public void cadastrar(Cadastro c) {
        if (c.email() == null || !c.email().matches(EMAIL_REGEX)) {
            throw new IllegalArgumentException("email inválido");
        }
        if (c.senha() == null || c.senha().length() < 8) {
            throw new IllegalArgumentException("senha deve ter pelo menos 8 caracteres");
        }
        if (c.nome() == null || c.nome().isBlank()) {
            throw new IllegalArgumentException("nome obrigatório");
        }
        String id = UlidGen.novo();
        String senhaHash = PasswordHasher.hash(c.senha());
        Instant agora = Instant.now();
        try (Connection conn = db.conexao();
             PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO usuarios(id, email, senha_hash, nome, fuso, ia_habilitada, criado_em, atualizado_em, versao, dono_id) " +
                "VALUES (?,?,?,?,'America/Sao_Paulo',1,?,?,1,?)")) {
            ps.setString(1, id);
            ps.setString(2, c.email().toLowerCase());
            ps.setString(3, senhaHash);
            ps.setString(4, c.nome());
            ps.setString(5, agora.toString());
            ps.setString(6, agora.toString());
            ps.setString(7, id);
            ps.executeUpdate();
        } catch (SQLException e) {
            if ("23505".equals(e.getSQLState()) || e.getMessage().toLowerCase().contains("unique")) {
                throw new IllegalArgumentException("email já cadastrado");
            }
            throw new RuntimeException("Falha ao cadastrar usuário", e);
        }
    }

    public LoginResult login(String email, String senha, String dispositivoNome, String sistema, String appVersao) {
        if (email == null || senha == null) {
            throw new IllegalArgumentException("credenciais obrigatórias");
        }
        String id;
        String nome;
        String fuso;
        boolean ia;
        String hash;
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(
                "SELECT id, nome, fuso, ia_habilitada, senha_hash FROM usuarios WHERE email = ?")) {
            ps.setString(1, email.toLowerCase());
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    throw new SecurityException("credenciais inválidas");
                }
                id = rs.getString("id");
                nome = rs.getString("nome");
                fuso = rs.getString("fuso");
                ia = rs.getInt("ia_habilitada") != 0;
                hash = rs.getString("senha_hash");
            }
        } catch (SQLException e) {
            throw new RuntimeException("Falha no login", e);
        }
        if (!PasswordHasher.verify(hash, senha)) {
            throw new SecurityException("credenciais inválidas");
        }
        // Garante dispositivo
        Dispositivo disp = upsertDispositivo(id, dispositivoNome, sistema, appVersao);
        // Cria sessão
        SessionService.Sessao sessao = sessionService.criar(id, disp.id);
        return new LoginResult(new Usuario(id, email, nome, fuso, ia), sessao);
    }

    public Usuario buscarUsuario(String id) {
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement("SELECT id, email, nome, fuso, ia_habilitada FROM usuarios WHERE id = ?")) {
            ps.setString(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;
                return new Usuario(rs.getString("id"), rs.getString("email"), rs.getString("nome"),
                    rs.getString("fuso"), rs.getInt("ia_habilitada") != 0);
            }
        } catch (SQLException e) {
            LOG.error("Falha ao buscar usuário", e);
            return null;
        }
    }

    public Dispositivo upsertDispositivo(String usuarioId, String nome, String sistema, String appVersao) {
        // Tenta achar existente pelo trio (usuario, sistema, appVersao) — heurística simples
        try (Connection c = db.conexao()) {
            try (PreparedStatement find = c.prepareStatement(
                "SELECT id FROM dispositivos WHERE usuario_id = ? AND sistema = ? AND app_versao = ? AND revogado_em IS NULL LIMIT 1")) {
                find.setString(1, usuarioId);
                find.setString(2, sistema == null ? "?" : sistema);
                find.setString(3, appVersao == null ? "?" : appVersao);
                try (ResultSet rs = find.executeQuery()) {
                    if (rs.next()) {
                        String id = rs.getString("id");
                        try (PreparedStatement up = c.prepareStatement(
                            "UPDATE dispositivos SET nome = ?, ultimo_acesso_em = ? WHERE id = ?")) {
                            up.setString(1, nome == null ? "Desconhecido" : nome);
                            up.setString(2, Instant.now().toString());
                            up.setString(3, id);
                            up.executeUpdate();
                        }
                        return new Dispositivo(id, nome, sistema, appVersao);
                    }
                }
            }
            // Cria
            String id = UlidGen.novo();
            try (PreparedStatement ins = c.prepareStatement(
                "INSERT INTO dispositivos(id, usuario_id, nome, sistema, app_versao, ultimo_acesso_em, criado_em, versao) " +
                "VALUES (?,?,?,?,?,?,?,1)")) {
                ins.setString(1, id);
                ins.setString(2, usuarioId);
                ins.setString(3, nome == null ? "Desconhecido" : nome);
                ins.setString(4, sistema == null ? "Desconhecido" : sistema);
                ins.setString(5, appVersao == null ? "0.0.0" : appVersao);
                ins.setString(6, Instant.now().toString());
                ins.setString(7, Instant.now().toString());
                ins.executeUpdate();
            }
            return new Dispositivo(id, nome, sistema, appVersao);
        } catch (SQLException e) {
            throw new RuntimeException("Falha ao registrar dispositivo", e);
        }
    }

    public java.util.List<Dispositivo> listarDispositivos(String usuarioId) {
        java.util.List<Dispositivo> out = new java.util.ArrayList<>();
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(
                "SELECT id, nome, sistema, app_versao FROM dispositivos WHERE usuario_id = ? AND revogado_em IS NULL ORDER BY ultimo_acesso_em DESC")) {
            ps.setString(1, usuarioId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    out.add(new Dispositivo(rs.getString("id"), rs.getString("nome"),
                        rs.getString("sistema"), rs.getString("app_versao")));
                }
            }
        } catch (SQLException e) {
            LOG.error("Falha ao listar dispositivos", e);
        }
        return out;
    }
}
