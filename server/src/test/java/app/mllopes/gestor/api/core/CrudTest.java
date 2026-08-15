package app.mllopes.gestor.api.core;

import app.mllopes.gestor.api.auth.AuthService;
import app.mllopes.gestor.api.auth.SessionService;
import app.mllopes.gestor.api.db.Db;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Teste do Crud genérico.
 */
class CrudTest {

    private Db db;
    private Crud crud;
    private String usuarioId;

    @BeforeEach
    void setup(@TempDir Path tmp) {
        db = new Db(tmp.resolve("crud.db").toString());
        db.abrir();
        db.migrar();
        AuthService auth = new AuthService(db, new SessionService(db));
        auth.cadastrar(new AuthService.Cadastro("u@x.com", "senha-123-456", "U", null, null, null));
        AuthService.LoginResult r = auth.login("u@x.com", "senha-123-456", null, null, null);
        this.usuarioId = r.usuario().id;
        this.crud = new Crud(db, "areas", List.of("nome", "cor", "ordem"));
    }

    @org.junit.jupiter.api.AfterEach
    void cleanup() {
        if (db != null) db.close();
    }

    @Test
    void criarListarBuscarAtualizarDeletar() {
        // Criar
        String id = crud.criar(usuarioId, Map.of("nome", "Pessoal", "cor", "#FF0000", "ordem", 1));
        assertNotNull(id);
        assertEquals(26, id.length(), "ULID tem 26 chars");

        // Listar
        List<Map<String, Object>> list = crud.listar(usuarioId);
        assertEquals(1, list.size());

        // Buscar
        Map<String, Object> row = crud.buscar(usuarioId, id);
        assertNotNull(row);
        assertEquals("Pessoal", row.get("nome"));

        // Atualizar (com versao correta)
        assertTrue(crud.atualizar(usuarioId, id, 1, Map.of("nome", "Trabalho")));

        // Buscar novamente
        row = crud.buscar(usuarioId, id);
        assertEquals("Trabalho", row.get("nome"));

        // Deletar
        assertTrue(crud.deletar(usuarioId, id));
        assertNull(crud.buscar(usuarioId, id));
    }

    @Test
    void conflitoDeVersaoRetornaFalse() {
        String id = crud.criar(usuarioId, Map.of("nome", "X", "ordem", 0));
        // Tenta atualizar com versao errada
        assertFalse(crud.atualizar(usuarioId, id, 99, Map.of("nome", "Y")));
        // E a linha nao mudou
        assertEquals("X", crud.buscar(usuarioId, id).get("nome"));
    }

    @Test
    void naoVazaDadosDeOutroUsuario() {
        // Cria area do usuarioId
        crud.criar(usuarioId, Map.of("nome", "Area Privada"));
        // Tenta buscar com outro usuarioId
        assertNull(crud.buscar("outro-usuario", "qualquer-id"));
        assertTrue(crud.listar("outro-usuario").isEmpty());
    }
}
