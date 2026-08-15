package app.mllopes.gestor.ui;

import app.mllopes.gestor.core.TarefaCore;
import app.mllopes.gestor.core.Version;
import app.mllopes.gestor.db.DesktopDb;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.paint.Color;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Controller principal da tela (Hoje + lista de tarefas).
 * Conforme docs/01-MODELO-DOMINIO.md e UI/UX de "premium, dark/light".
 */
public final class MainController {

    @FXML private Label versaoLabel;
    @FXML private Label statusLabel;
    @FXML private Label hojeLabel;
    @FXML private Label detalheTitulo;
    @FXML private Label detalheMeta;
    @FXML private Label detalheCobranca;
    @FXML private Label contadoresLabel;

    @FXML private ComboBox<String> filtroStatus;
    @FXML private ComboBox<String> filtroPrioridade;
    @FXML private TextField filtroTexto;

    @FXML private TableView<Map<String, Object>> tabelaTarefas;
    @FXML private TableColumn<Map<String, Object>, String> colStatus;
    @FXML private TableColumn<Map<String, Object>, String> colTitulo;
    @FXML private TableColumn<Map<String, Object>, String> colPrioridade;
    @FXML private TableColumn<Map<String, Object>, String> colNivel;
    @FXML private TableColumn<Map<String, Object>, String> colVencimento;
    @FXML private TableColumn<Map<String, Object>, String> colAtualizado;

    private DesktopDb db;
    private final ObservableList<Map<String, Object>> dados = FXCollections.observableArrayList();
    private final ZoneId fuso = ZoneId.of("America/Sao_Paulo");

    public void setDb(DesktopDb db) { this.db = db; }

    @FXML
    public void initialize() {
        versaoLabel.setText("v" + Version.APP);
        statusLabel.setText("● offline");
        hojeLabel.setText(TarefaCore.hojeFormatado(Instant.now(), fuso));
        filtroStatus.getItems().addAll("Todos", "CAIXA_ENTRADA", "PLANEJADA", "EM_ANDAMENTO",
            "AGUARDANDO_TERCEIRO", "BLOQUEADA", "EM_REVISAO", "ENTREGUE_AGUARDANDO_CONFIRMACAO",
            "CONCLUIDA", "ADIADA", "CANCELADA");
        filtroStatus.getSelectionModel().selectFirst();
        filtroPrioridade.getItems().addAll("Todas", "BAIXA", "NORMAL", "ALTA", "URGENTE", "CRITICA");
        filtroPrioridade.getSelectionModel().selectFirst();

        colStatus.setCellValueFactory(c -> cellOf(c.getValue(), "status"));
        colTitulo.setCellValueFactory(c -> cellOf(c.getValue(), "titulo"));
        colPrioridade.setCellValueFactory(c -> cellOf(c.getValue(), "prioridade"));
        colNivel.setCellValueFactory(c -> cellOf(c.getValue(), "nivel_cobranca"));
        colVencimento.setCellValueFactory(c -> cellOf(c.getValue(), "vencimento_em"));
        colAtualizado.setCellValueFactory(c -> cellOf(c.getValue(), "atualizado_em"));

        colStatus.setCellFactory(c -> new TableCell<>() {
            @Override protected void updateItem(String v, boolean empty) {
                super.updateItem(v, empty);
                if (empty || v == null) { setText(null); setStyle(""); return; }
                setText(v);
                setStyle("-fx-text-fill: " + TarefaCore.corPrioridade(v) + "; -fx-font-weight: 600;");
            }
        });
        colPrioridade.setCellFactory(c -> new TableCell<>() {
            @Override protected void updateItem(String v, boolean empty) {
                super.updateItem(v, empty);
                if (empty || v == null) { setText(null); setStyle(""); return; }
                setText(v);
                setStyle("-fx-text-fill: " + TarefaCore.corPrioridade(v) + "; -fx-font-weight: 600;");
            }
        });
        colNivel.setCellFactory(c -> new TableCell<>() {
            @Override protected void updateItem(String v, boolean empty) {
                super.updateItem(v, empty);
                if (empty || v == null) { setText(null); setStyle(""); return; }
                setText(v);
                setStyle("-fx-text-fill: " + TarefaCore.corNivel(v) + ";");
            }
        });
        colVencimento.setCellFactory(c -> new TableCell<>() {
            @Override protected void updateItem(String v, boolean empty) {
                super.updateItem(v, empty);
                if (empty || v == null) { setText("—"); setStyle(""); return; }
                try { setText(TarefaCore.vencimentoRelativo(Instant.parse(v), Instant.now(), fuso)); }
                catch (Exception e) { setText(v); }
                try {
                    Instant venc = Instant.parse(v);
                    if (venc.isBefore(Instant.now())) {
                        setStyle("-fx-text-fill: #f44336; -fx-font-weight: 600;");
                    } else {
                        setStyle("");
                    }
                } catch (Exception ignored) { setStyle(""); }
            }
        });
        colAtualizado.setCellFactory(c -> new TableCell<>() {
            private final DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM HH:mm").withZone(fuso);
            @Override protected void updateItem(String v, boolean empty) {
                super.updateItem(v, empty);
                if (empty || v == null) { setText(null); return; }
                try { setText(fmt.format(Instant.parse(v))); }
                catch (Exception e) { setText(v); }
            }
        });

        tabelaTarefas.setItems(dados);
        tabelaTarefas.getSelectionModel().selectedItemProperty().addListener((obs, old, sel) -> mostrarDetalhe(sel));

        atualizar();
    }

    @FXML
    public void atualizar() {
        if (db == null) {
            statusLabel.setText("● sem banco");
            return;
        }
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(
                "SELECT id, status, titulo, prioridade, nivel_cobranca, vencimento_em, atualizado_em, " +
                "descricao, area_id, projeto_id, cliente_id FROM tarefas " +
                "ORDER BY atualizado_em DESC LIMIT 200")) {
            try (ResultSet rs = ps.executeQuery()) {
                dados.clear();
                int total = 0, vencidas = 0;
                Instant agora = Instant.now();
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getString("id"));
                    m.put("status", rs.getString("status"));
                    m.put("titulo", rs.getString("titulo"));
                    m.put("descricao", rs.getString("descricao"));
                    m.put("prioridade", rs.getString("prioridade"));
                    m.put("nivel_cobranca", rs.getString("nivel_cobranca"));
                    m.put("vencimento_em", rs.getString("vencimento_em"));
                    m.put("atualizado_em", rs.getString("atualizado_em"));
                    m.put("area_id", rs.getString("area_id"));
                    m.put("projeto_id", rs.getString("projeto_id"));
                    m.put("cliente_id", rs.getString("cliente_id"));
                    dados.add(m);
                    total++;
                    String v = rs.getString("vencimento_em");
                    if (v != null) {
                        try {
                            if (Instant.parse(v).isBefore(agora)) vencidas++;
                        } catch (Exception ignored) {}
                    }
                }
                contadoresLabel.setText(total + " tarefas · " + vencidas + " vencidas");
                statusLabel.setText("● " + dados.size() + " carregadas");
            }
        } catch (SQLException e) {
            statusLabel.setText("● erro: " + e.getMessage());
        }
    }

    @FXML
    public void novaTarefa() {
        TextInputDialog d = new TextInputDialog();
        d.setTitle("Nova tarefa");
        d.setHeaderText("Criar tarefa rápida");
        d.setContentText("Título:");
        d.showAndWait().ifPresent(titulo -> {
            if (titulo == null || titulo.isBlank()) return;
            try (Connection c = db.conexao();
                 PreparedStatement ps = c.prepareStatement(
                    "INSERT INTO tarefas(id, usuario_id, dono_id, titulo, status, prioridade, nivel_cobranca, criado_em, atualizado_em, versao) " +
                    "VALUES (?,?,?,?, 'CAIXA_ENTRADA', 'NORMAL', 'PERSISTENTE', ?, ?, 1)")) {
                String id = "01DESK" + System.currentTimeMillis();
                ps.setString(1, id);
                ps.setString(2, "desktop-local");
                ps.setString(3, "desktop-local");
                ps.setString(4, titulo);
                String agora = Instant.now().toString();
                ps.setString(5, agora);
                ps.setString(6, agora);
                ps.executeUpdate();
                atualizar();
            } catch (SQLException e) {
                statusLabel.setText("● erro: " + e.getMessage());
            }
        });
    }

    @FXML
    public void concluirSelecionada() { mudarStatus("CONCLUIDA"); }
    @FXML
    public void cancelarSelecionada() {
        TextInputDialog d = new TextInputDialog();
        d.setTitle("Cancelar tarefa");
        d.setHeaderText("Informe o motivo do cancelamento");
        d.setContentText("Motivo:");
        d.showAndWait().ifPresent(motivo -> {
            if (motivo == null || motivo.isBlank()) return;
            mudarStatusMotivo("CANCELADA", motivo);
        });
    }
    @FXML
    public void adiarSelecionada() {
        TextInputDialog d = new TextInputDialog("+1d");
        d.setTitle("Adiar tarefa");
        d.setHeaderText("Novo vencimento (ISO 8601 ou relativo tipo +1d, +2h)");
        d.setContentText("Vencimento:");
        d.showAndWait().ifPresent(s -> {
            if (s == null || s.isBlank()) return;
            try {
                Instant novo;
                if (s.startsWith("+")) {
                    String dur = s.substring(1);
                    if (dur.endsWith("d")) novo = Instant.now().plusSeconds(Long.parseLong(dur.replace("d", "")) * 86400);
                    else if (dur.endsWith("h")) novo = Instant.now().plusSeconds(Long.parseLong(dur.replace("h", "")) * 3600);
                    else novo = Instant.now().plusSeconds(Long.parseLong(dur));
                } else {
                    novo = Instant.parse(s);
                }
                Map<String, Object> sel = tabelaTarefas.getSelectionModel().getSelectedItem();
                if (sel == null) return;
                try (Connection c = db.conexao();
                     PreparedStatement ps = c.prepareStatement(
                        "UPDATE tarefas SET vencimento_em = ?, status = 'ADIADA', atualizado_em = ?, versao = versao + 1 WHERE id = ?")) {
                    ps.setString(1, novo.toString());
                    ps.setString(2, Instant.now().toString());
                    ps.setString(3, sel.get("id").toString());
                    ps.executeUpdate();
                    atualizar();
                }
            } catch (Exception e) {
                statusLabel.setText("● erro: " + e.getMessage());
            }
        });
    }

    private void mudarStatus(String novo) {
        Map<String, Object> sel = tabelaTarefas.getSelectionModel().getSelectedItem();
        if (sel == null) return;
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(
                "UPDATE tarefas SET status = ?, atualizado_em = ?, versao = versao + 1 WHERE id = ?")) {
            ps.setString(1, novo);
            ps.setString(2, Instant.now().toString());
            ps.setString(3, sel.get("id").toString());
            ps.executeUpdate();
            atualizar();
        } catch (SQLException e) {
            statusLabel.setText("● erro: " + e.getMessage());
        }
    }

    private void mudarStatusMotivo(String novo, String motivo) {
        Map<String, Object> sel = tabelaTarefas.getSelectionModel().getSelectedItem();
        if (sel == null) return;
        try (Connection c = db.conexao();
             PreparedStatement ps = c.prepareStatement(
                "UPDATE tarefas SET status = ?, motivo_cancelamento = ?, atualizado_em = ?, versao = versao + 1 WHERE id = ?")) {
            ps.setString(1, novo);
            ps.setString(2, motivo);
            ps.setString(3, Instant.now().toString());
            ps.setString(4, sel.get("id").toString());
            ps.executeUpdate();
            atualizar();
        } catch (SQLException e) {
            statusLabel.setText("● erro: " + e.getMessage());
        }
    }

    private void mostrarDetalhe(Map<String, Object> sel) {
        if (sel == null) {
            detalheTitulo.setText("Selecione uma tarefa");
            detalheMeta.setText("");
            detalheCobranca.setText("");
            return;
        }
        detalheTitulo.setText(str(sel, "titulo"));
        detalheMeta.setText(String.format("Status: %s · Prioridade: %s · Nível: %s",
            str(sel, "status"), str(sel, "prioridade"), str(sel, "nivel_cobranca")));
        String v = str(sel, "vencimento_em");
        if (v != null) {
            try {
                Instant venc = Instant.parse(v);
                long h = java.time.Duration.between(venc, Instant.now()).toHours();
                detalheCobranca.setText("Vencimento: " + v + (h > 0 ? "  ·  " + h + "h em atraso" : "  ·  no prazo"));
            } catch (Exception e) {
                detalheCobranca.setText("Vencimento: " + v);
            }
        } else {
            detalheCobranca.setText("Sem vencimento.");
        }
    }

    private static javafx.beans.value.ObservableValue<String> cellOf(Map<String, Object> row, String key) {
        Object v = row == null ? null : row.get(key);
        return javafx.beans.binding.Bindings.createStringBinding(() -> v == null ? "" : v.toString());
    }
    private static String str(Map<String, Object> m, String k) {
        Object v = m == null ? null : m.get(k);
        return v == null ? "" : v.toString();
    }
}
