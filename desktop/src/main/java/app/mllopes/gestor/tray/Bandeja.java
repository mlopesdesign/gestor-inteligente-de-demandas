package app.mllopes.gestor.tray;

import app.mllopes.gestor.observability.AppLogger;
import org.slf4j.Logger;

import java.awt.AWTException;
import java.awt.Image;
import java.awt.MenuItem;
import java.awt.PopupMenu;
import java.awt.SystemTray;
import java.awt.TrayIcon;
import java.awt.image.BufferedImage;
import java.util.Objects;

/**
 * Ícone na bandeja do Windows (SystemTray) com menu.
 *
 * <p>Conforme ADR 0005 e PROJETO §6.1: bandeja + autostart + notificações
 * persistentes.
 *
 * <p>Fase 2: implementação stub usando {@link java.awt.SystemTray} puro.
 * Em F4 será complementada com notificação nativa via JNA + WinRT
 * (AppNotificationManager) com fallback para {@code displayMessage}.
 */
public final class Bandeja {

    private static final Logger LOG = AppLogger.get(Bandeja.class);

    private final Runnable onAbrir;
    private final Runnable onSair;
    private TrayIcon trayIcon;

    public Bandeja(Runnable onAbrir, Runnable onSair) {
        this.onAbrir = Objects.requireNonNull(onAbrir);
        this.onSair = Objects.requireNonNull(onSair);
    }

    public void instalar() {
        if (!SystemTray.isSupported()) {
            LOG.warn("SystemTray não suportado neste SO. Continuando sem bandeja.");
            return;
        }
        try {
            PopupMenu menu = new PopupMenu();

            MenuItem abrir = new MenuItem("Abrir Gestor");
            abrir.addActionListener(e -> onAbrir.run());

            MenuItem sair = new MenuItem("Sair");
            sair.addActionListener(e -> onSair.run());

            menu.add(abrir);
            menu.addSeparator();
            menu.add(sair);

            this.trayIcon = new TrayIcon(criarIcone(), "Gestor Inteligente de Demandas", menu);
            this.trayIcon.setImageAutoSize(true);
            this.trayIcon.addActionListener(e -> onAbrir.run());  // duplo-clique

            SystemTray.getSystemTray().add(this.trayIcon);
            LOG.info("Bandeja instalada");
        } catch (AWTException e) {
            LOG.error("Falha ao instalar bandeja", e);
        }
    }

    public void mostrarMensagemInicializacao() {
        if (trayIcon != null) {
            try {
                trayIcon.displayMessage(
                    "Gestor em segundo plano",
                    "Clique no ícone para abrir. Notificações ativas.",
                    TrayIcon.MessageType.INFO
                );
            } catch (Exception e) {
                LOG.warn("Não foi possível mostrar mensagem da bandeja", e);
            }
        }
    }

    public void remover() {
        if (trayIcon != null) {
            try { SystemTray.getSystemTray().remove(this.trayIcon); }
            catch (Exception e) { LOG.warn("Falha ao remover bandeja", e); }
        }
    }

    private static Image criarIcone() {
        // Placeholder 16x16 cinza. Em F3+ substituir por ícone real carregado de resources.
        BufferedImage img = new BufferedImage(16, 16, BufferedImage.TYPE_INT_ARGB);
        for (int y = 0; y < 16; y++) {
            for (int x = 0; x < 16; x++) {
                img.setRGB(x, y, 0xFF4A6FA5);
            }
        }
        return img;
    }
}
