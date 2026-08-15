package app.mllopes.gestor.api.auth;

import app.mllopes.gestor.api.db.Db;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Teste E2E do AuthService: cadastrar → login → dispositivo → sessão.
 */
class AuthServiceTest {

    private Db db;
    private AuthService auth;
    private SessionService session;
    private Path tmpDir;

    @BeforeEach
    void setup(@TempDir Path tmp) {
        tmpDir = tmp;
        db = new Db(tmp.resolve("auth.db").toString());
        db.abrir();
        db.migrar();
        session = new SessionService(db);
        auth = new AuthService(db, session);
    }

    @org.junit.jupiter.api.AfterEach
    void cleanup() {
        if (db != null) db.close();
    }

    @Test
    void cadastrarELogarComSessao() {
        auth.cadastrar(new AuthService.Cadastro(
            "marcio@example.com", "senha-segura-123", "Marcio",
            "Lopes-Desktop", "Windows 11 Pro 23H2", "0.1.0"));

        AuthService.LoginResult r = auth.login(
            "marcio@example.com", "senha-segura-123",
            "Lopes-Desktop", "Windows 11 Pro 23H2", "0.1.0");

        assertNotNull(r);
        assertNotNull(r.usuario());
        assertEquals("marcio@example.com", r.usuario().email);
        assertNotNull(r.sessao().token());
        assertTrue(r.sessao().token().length() >= 32, "token >= 32 chars hex");

        // Sessão pode ser validada
        SessionService.Sessao s = session.buscar(r.sessao().token());
        assertNotNull(s);
        assertEquals(r.usuario().id, s.usuarioId());
    }

    @Test
    void loginComSenhaErradaFalha() {
        auth.cadastrar(new AuthService.Cadastro(
            "x@y.com", "senha-correta-123", "X", null, "Linux", "0.1.0"));
        assertThrows(SecurityException.class, () -> auth.login("x@y.com", "errada-1234567", null, "Linux", "0.1.0"));
    }

    @Test
    void emailDuplicadoRejeita() {
        auth.cadastrar(new AuthService.Cadastro("a@b.com", "senha-123-123", "A", null, null, null));
        assertThrows(IllegalArgumentException.class, () -> auth.cadastrar(
            new AuthService.Cadastro("a@b.com", "outra-123-456", "Outro", null, null, null)));
    }

    @Test
    void emailInvalidoRejeita() {
        assertThrows(IllegalArgumentException.class, () -> auth.cadastrar(
            new AuthService.Cadastro("nao-eh-email", "senha-123-456", "X", null, null, null)));
    }

    @Test
    void dispositivoEhRegistradoAutomaticamente() {
        auth.cadastrar(new AuthService.Cadastro(
            "dev@x.com", "senha-123-456", "Dev", "Meu-Notebook", "Windows 11", "0.1.0"));
        AuthService.LoginResult r = auth.login(
            "dev@x.com", "senha-123-456", "Meu-Notebook", "Windows 11", "0.1.0");
        assertNotNull(r.sessao().dispositivoId());

        // Re-login mesmo dispositivo atualiza ultimo_acesso_em em vez de criar novo
        AuthService.LoginResult r2 = auth.login(
            "dev@x.com", "senha-123-456", "Meu-Notebook", "Windows 11", "0.1.0");
        assertEquals(r.sessao().dispositivoId(), r2.sessao().dispositivoId(),
            "mesmo (sistema+app) reusa dispositivo");
    }

    @Test
    void senhaCurtaRejeita() {
        assertThrows(IllegalArgumentException.class, () -> auth.cadastrar(
            new AuthService.Cadastro("ok@x.com", "123", "X", null, null, null)));
    }

    @Test
    void sessaoRevogadaNaoPodeSerUsada() throws Exception {
        auth.cadastrar(new AuthService.Cadastro(
            "r@x.com", "senha-123-456", "R", null, null, null));
        AuthService.LoginResult r = auth.login("r@x.com", "senha-123-456", null, null, null);
        session.revogar(r.sessao().id());
        assertNull(session.buscar(r.sessao().token()), "sessão revogada deve retornar null");
    }
}
