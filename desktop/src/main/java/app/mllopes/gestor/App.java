package app.mllopes.gestor;

import app.mllopes.gestor.core.Version;
import app.mllopes.gestor.db.DesktopDb;
import app.mllopes.gestor.observability.AppLogger;
import app.mllopes.gestor.tray.Bandeja;
import app.mllopes.gestor.ui.MainController;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.scene.image.Image;
import javafx.scene.layout.BorderPane;
import javafx.stage.Stage;
import org.slf4j.Logger;

import java.io.InputStream;
import java.net.URL;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Aplicação desktop principal (JavaFX 21 + JNA 5 + Xerial SQLite JDBC).
 * Identidade imutável (AGENTS §1): app.mllopes.gestor, %APPDATA%/GestorInteligenteDeDemandas.
 */
public final class App extends Application {

    private static final Logger LOG = AppLogger.get(App.class);

    public static final String APP_ID = "app.mllopes.gestor";

    private Stage stage;
    private DesktopDb db;
    private Bandeja bandeja;
    private MainController controller;

    @Override
    public void init() throws Exception {
        super.init();
        LOG.info("Iniciando Gestor Inteligente de Demandas v{} ({})", Version.APP, APP_ID);
    }

    @Override
    public void start(Stage primaryStage) throws Exception {
        this.stage = primaryStage;

        Path dataDir = resolveDataDir();
        this.db = new DesktopDb(dataDir.resolve("gestor_local.db"));
        this.db.abrir();
        garantirSchemaLocal();
        semearDadosDemo();

        this.bandeja = new Bandeja(this::mostrarJanelaPrincipal, this::sair);
        this.bandeja.instalar();

        FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/main.fxml"));
        BorderPane root = loader.load();
        this.controller = loader.getController();
        this.controller.setDb(db);

        Scene scene = new Scene(root, 1000, 640);
        scene.getStylesheets().add(getClass().getResource("/css/app.css").toExternalForm());

        URL iconUrl = getClass().getResource("/icons/app.png");
        if (iconUrl != null) {
            try (InputStream in = iconUrl.openStream()) {
                primaryStage.getIcons().add(new Image(in));
            } catch (Exception ignored) {}
        }

        primaryStage.setTitle("Gestor Inteligente de Demandas v" + Version.APP);
        primaryStage.setScene(scene);
        primaryStage.setOnCloseRequest(e -> {
            e.consume();
            esconderParaBandeja();
        });
        primaryStage.show();
        Platform.setImplicitExit(false);
        LOG.info("Aplicação iniciada. Janela visível. Bandeja instalada.");
    }

    /** Garante que o schema local existe (idempotente). */
    private void garantirSchemaLocal() {
        try (var c = db.conexao(); var s = c.createStatement()) {
            s.execute("CREATE TABLE IF NOT EXISTS tarefas (" +
                "id TEXT PRIMARY KEY, " +
                "usuario_id TEXT NOT NULL, " +
                "dono_id TEXT NOT NULL, " +
                "titulo TEXT NOT NULL, " +
                "descricao TEXT, " +
                "area_id TEXT, " +
                "projeto_id TEXT, " +
                "cliente_id TEXT, " +
                "status TEXT NOT NULL DEFAULT 'CAIXA_ENTRADA', " +
                "prioridade TEXT NOT NULL DEFAULT 'NORMAL', " +
                "nivel_cobranca TEXT NOT NULL DEFAULT 'PERSISTENTE', " +
                "vencimento_em TEXT, " +
                "criado_em TEXT NOT NULL, " +
                "atualizado_em TEXT NOT NULL, " +
                "versao INTEGER NOT NULL DEFAULT 1, " +
                "motivo_cancelamento TEXT, " +
                "motivo_adiamento TEXT" +
                ")");
            s.execute("CREATE INDEX IF NOT EXISTS idx_tarefas_atualizado ON tarefas(atualizado_em)");
            s.execute("CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status)");
        } catch (Exception e) {
            LOG.error("Falha ao garantir schema local", e);
        }
    }

    /** Semeia dados de demonstração se o banco estiver vazio. */
    private void semearDadosDemo() {
        try (var c = db.conexao(); var s = c.createStatement()) {
            try (var rs = s.executeQuery("SELECT COUNT(*) FROM tarefas")) {
                if (rs.next() && rs.getInt(1) > 0) return;
            }
            String agora = java.time.Instant.now().toString();
            String[] amostras = new String[] {
                "Revisar proposta do cliente Cenário Alagoas",
                "Atualizar tema do portal cenárioalagoas.com.br",
                "Pagar boleto MLopes Finance",
                "Ligar para contador",
                "Estudar ADR 0002 (sincronização)"
            };
            String[] status = new String[] {"CAIXA_ENTRADA", "EM_ANDAMENTO", "PLANEJADA", "AGUARDANDO_TERCEIRO", "CAIXA_ENTRADA"};
            String[] prios  = new String[] {"ALTA", "URGENTE", "NORMAL", "NORMAL", "BAIXA"};
            for (int i = 0; i < amostras.length; i++) {
                String id = "01DESK" + System.currentTimeMillis() + "_" + i;
                try (var ps = c.prepareStatement(
                    "INSERT INTO tarefas(id, usuario_id, dono_id, titulo, status, prioridade, nivel_cobranca, criado_em, atualizado_em, versao) " +
                    "VALUES (?, 'desktop-local','desktop-local', ?, ?, ?, 'PERSISTENTE', ?, ?, 1)")) {
                    ps.setString(1, id);
                    ps.setString(2, amostras[i]);
                    ps.setString(3, status[i]);
                    ps.setString(4, prios[i]);
                    ps.setString(5, agora);
                    ps.setString(6, agora);
                    ps.executeUpdate();
                }
            }
            LOG.info("Semeadas {} tarefas de demonstração", amostras.length);
        } catch (Exception e) {
            LOG.warn("Falha ao semear dados de demo (não bloqueante)", e);
        }
    }

    public void mostrarJanelaPrincipal() {
        if (stage == null) return;
        Platform.runLater(() -> { stage.show(); stage.toFront(); stage.requestFocus(); });
    }

    public void esconderParaBandeja() {
        if (stage == null) return;
        Platform.runLater(() -> { stage.hide(); bandeja.mostrarMensagemInicializacao(); });
    }

    public void sair() {
        LOG.info("Saindo...");
        if (bandeja != null) bandeja.remover();
        if (db != null) db.close();
        Platform.exit();
    }

    private static Path resolveDataDir() {
        String appdata = System.getenv("APPDATA");
        if (appdata == null || appdata.isBlank()) {
            appdata = System.getProperty("user.home") + "/.local/share";
        }
        return Paths.get(appdata, "GestorInteligenteDeDemandas");
    }

    @Override
    public void stop() {
        LOG.info("stop() da Application");
        if (bandeja != null) bandeja.remover();
        if (db != null) db.close();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
