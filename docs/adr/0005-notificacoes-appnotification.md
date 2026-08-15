# ADR 0005 — Notificações via JNA + `AppNotificationManager` (WinRT) com fallback AWT

> **Vinculante.** Precedência #3.
> Decidido em 14/08/2026 (Fase 0).
> **Revisão 1 (mesmo dia):** stack migrada para Java. Esta ADR passa a usar **JNA (Java Native Access) + WinRT** para chamar a API moderna da Microsoft, com fallback para `java.awt.TrayIcon.displayMessage` se a notificação moderna falhar.

---

## Status

Aceito — **revisão 1** substitui a versão PowerShell.

## Contexto

PROJETO §6.1, §6.3, §9.2, §9.3, §9.4 (inalterado):

- Execução em segundo plano.
- Notificações nativas com a janela principal fechada.
- 4 modos de cobrança: discreta, persistente, intensiva, crítica.
- Ações na notificação: abrir, iniciar, concluir, adiar, reprogramar c/ motivo, bloquear, silenciar.
- Fechar a notificação ≠ concluir.
- Canais externos (e-mail, Telegram, WhatsApp, push) como adaptadores; **nenhum** substitui a notificação local.

Padrão ML Lopes §1 (cliente sem dependência externa não-controlada) — Java: dependência é JNA, que é apenas uma ponte para WinRT nativo do Windows, sem runtime extra.

## Decisão

### Caminho da notificação

**JNA chama `Microsoft.Windows.AppNotifications` (WinRT) diretamente do JVM.**

Por quê:
- `AppNotificationManager` (namespace `Microsoft.Windows.AppNotifications`) é a API atual recomendada pela Microsoft para Win32 unpackaged (substitui a antiga `ToastNotificationManager` UWP).
- Funciona com `AppUserModelID` registrado (sem precisar de `Package.appxmanifest`).
- Permite botões de ação (concluir, adiar, bloquear, etc.).
- JNA permite chamar WinRT de dentro do JVM sem C++/WinRT nem .NET adicional.
- **Fallback:** se a chamada JNA falhar (JNA não inicializou, AUMID não registrado, Windows <10), `java.awt.TrayIcon.displayMessage` exibe um balão nativo simples (sem botões de ação, mas funciona).

### AppUserModelID

- Valor: `app.mllopes.gestor`.
- Registrado pelo instalador (script PowerShell pós-instal, disparado pelo `jpackage` via `--post-install-script`):
  ```powershell
  # install-aumid.ps1
  $aumid = "app.mllopes.gestor"
  $displayName = "Gestor Inteligente de Demandas"
  $icon = "C:\Program Files\GestorInteligenteDeDemandas\app.ico"
  $clsid = "{C173E6AD-F0C3-4F8E-9D6C-7E2B1F2E3A4D}"  # CLSID estável gerado uma vez
  New-Item -Path "HKCU:\Software\Classes\AppUserModelId\$aumid" -Force | Out-Null
  Set-ItemProperty -Path "HKCU:\Software\Classes\AppUserModelId\$aumid" -Name "DisplayName" -Value $displayName
  Set-ItemProperty -Path "HKCU:\Software\Classes\AppUserModelId\$aumid" -Name "IconUri" -Value $icon
  Set-ItemProperty -Path "HKCU:\Software\Classes\AppUserModelId\$aumid" -Name "ToastActivatorClsid" -Value $clsid
  ```
- Script de desinstal remove as chaves.

### Componente Java: `Notificador`

`desktop/src/main/java/app/mllopes/gestor/notifications/Notificador.java`

```java
public class Notificador {
    private final WinRtAppNotificationManager winrt; // JNA
    private final AwtTrayFallback fallback;
    private final FilaNotificacoes fila;

    public void enviar(Lembrete lembrete, Tarefa tarefa) {
        try {
            winrt.show(lembrete, tarefa, getAumid());
        } catch (WinRtException e) {
            log.warn("WinRT falhou, usando fallback AWT: {}", e.getMessage());
            fallback.show(lembrete, tarefa);
        }
        fila.marcarEntregue(lembrete.id());
    }

    public void registrarAcaoHandler(Consumer<AcaoNotificacao> handler) {
        winrt.onActivated(handler);
    }
}
```

### Fila de notificações

- Tabela SQLite local `fila_notificacoes`:
  ```sql
  CREATE TABLE fila_notificacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lembrete_id TEXT NOT NULL,
    tarefa_id TEXT NOT NULL,
    nivel TEXT NOT NULL,         -- 'discreta' | 'persistente' | 'intensiva' | 'critica'
    titulo TEXT NOT NULL,
    corpo TEXT NOT NULL,
    botoes_json TEXT NOT NULL,   -- JSON com ações
    programada_para TEXT NOT NULL,
    entregue_em TEXT,
    visualizada_em TEXT,
    tentativas INTEGER NOT NULL DEFAULT 0,
    ultimo_erro TEXT
  );
  ```
- Alimentada pela UI (JavaFX) ao criar/atualizar lembrete.
- Consumida por um **scheduler interno** (ScheduledExecutorService em thread daemon) que dispara as notificações no momento certo.

### Ações via notificação

Quando o usuário clica em um botão da notificação moderna (`AppNotificationManager`):

1. JNA recebe o evento `Activated` via callback registrado.
2. Despacha para um `Consumer<AcaoNotificacao>` injetado.
3. O handler:
   - Faz `POST /api/tarefas/<id>/concluir` (ou similar) ao servidor local.
   - Atualiza a fila (`visualizada_em`).
   - Envia SSE push para outros dispositivos (que sincronizam).
4. Logs de auditoria: `acao='notificacao_acao'` com `tipo_acao`.

Para o fallback AWT (sem botões), as ações ficam disponíveis apenas abrindo a janela principal (clique no toast = foca a janela).

### Comportamento por nível de cobrança (PROJETO §9.2)

| Nível | Antecedência | Intervalo de repetição | Visual (WinRT) | Ações (botões no toast) |
|---|---|---|---|---|
| Discreta | 1h, no vencimento | não repete | toast simples | "Abrir" |
| Persistente | 2h, 1h, 30min, vencimento, +30min | 30min até decisão | borda amarela | "Abrir", "Concluir", "Adiar 15min" |
| Intensiva | 4h, 2h, 1h, 30min, vencimento, +15min, +1h | 15min até decisão | borda vermelha + som | "Abrir", "Iniciar agora", "Concluir", "Adiar", "Reprogramar", "Bloquear" |
| Crítica | 8h, 4h, 2h, 1h, 30min, vencimento, +10min, +30min, +1h, +2h | 10min até decisão | banner persistente + som + ícone de marca | todas acima + "Cancelar c/ motivo" |

**Fechar a notificação ≠ concluir.** `Dismissed` é capturado e apenas atualiza o estado "visto em <timestamp>" na fila. A próxima janela de cobrança é recalculada pelo motor de cobrança.

### Segundo plano

- Janela JavaFX pode ser minimizada ou fechada; a aplicação continua rodando (JVM não sai).
- **Trick:** `Platform.setImplicitExit(false)` mantém o JavaFX Application Thread vivo; `ScheduledExecutorService` continua.
- **Ícone na bandeja:** `java.awt.SystemTray` + `TrayIcon` com `PopupMenu` (Abrir, Captura rápida, Sair).
- **Watchdog:** se o processo JVM travar ou morrer, o usuário reinicia pelo atalho; documentado.

### Canais externos (adaptadores)

Interface Java (servidor):

```java
public interface NotificadorRemoto {
    CompletableFuture<EnvioResultado> enviar(NotificacaoLembrete n);
    String nome();            // 'smtp' | 'telegram' | 'whatsapp' | 'push-web'
    boolean habilitadoPara(Usuario u);
}
```

Implementações:
- `NotificadorSmtp` (Jakarta Mail / JavaMail)
- `NotificadorTelegram` (HTTP via `java.net.http.HttpClient`)
- `NotificadorWhatsApp` (provedor oficial, quando aplicável)

Servidor escolhe adaptadores ativos pela config do usuário. **Cliente (desktop) só usa o caminho local do Windows** (JNA + AWT fallback). Web usa SSE.

**Nenhum canal externo substitui a notificação local do Windows.** A local é sempre disparada, mesmo se todos os externos falharem.

### Política de retry

- Falha de envio (notificação recusada pelo Windows) → 3 tentativas com backoff 5s, 30s, 5min.
- Falha persistente → marca como `falhou` na fila; próxima janela do motor recalcula.
- Cancelamento manual do usuário (`desativar canal X por Y horas`) → registrado em `usuarios.canal_pausado_ate`.

### Logs e auditoria

- Cada envio: `auditoria` recebe `acao='notificacao_enviada'` com `canal`, `lembrete_id`, `tarefa_id`, `nivel_cobranca`, `dispositivo_id`.
- Cada falha: `acao='notificacao_falhou'` com `motivo`.
- Cada clique/ação: `acao='notificacao_acao'` com `tipo_acao`.
- Cada fallback AWT usado: log WARN com motivo.

## Consequências

### Positivas

- Notificação nativa moderna, com botões, som, persistência no Action Center.
- Funciona com a janela fechada (JVM continua rodando, ScheduledExecutorService ativo).
- Ações via notificação reduzem ida-e-volta na UI.
- Fallback AWT garante funcionamento mesmo se JNA/WinRT falhar.
- Multi-canal preparado (e-mail, Telegram) sem reescrita do motor.
- Logs auditáveis.

### Negativas

- **JNA + WinRT** é mais complexo que PowerShell. Mitigação: encapsular em `Notificador` com fallback automático.
- **`AppNotificationManager` exige .NET 6+ runtime** (já presente no Windows 11). Em Windows 10 sem .NET 6, fallback AWT.
- **CLSID do COM activator** precisa ser gerado uma vez e congelado (UUID).
- **Tamanho do JAR** aumenta ~3-5 MB com JNA + bindings WinRT.
- **JVM ocupa ~100-200 MB de RAM** em segundo plano. Aceito.

### Neutras

- Cancelamento programático é suportado, mas evitamos — política é "continua cobrando até decisão".

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| `ToastNotificationManager` (UWP) | API antiga, em manutenção. Microsoft recomenda `AppNotificationManager`. |
| PowerShell externo (plano original) | Quebra decisão Java. Java deve fazer tudo. |
| `java.awt.TrayIcon.displayMessage` apenas | Sem botões de ação, sem persistência moderna. |
| Notificação pelo próprio Javalin/HTTP | Não dispara nada no desktop sem cliente ativo. |
| `WindowsAppSDK` em C# (com interop) | Exige .NET runtime + DLLs extras. JNA é mais leve. |
| Toast via WinForms / WPF | Exige runtime adicional no cliente. |
| Node nativo para o daemon | Cliente não tem Node (Padrão §1). |
| BurntToast (PowerShell) | Boa opção para dev, mas exige módulo instalado. JNA é mais portátil. |
| Notificação em janela JavaFX sempre visível | Não atende "com janela fechada" do PROJETO §9. |

## Links

- `PROJETO-GESTOR-INTELIGENTE-DE-DEMANDAS.md` §6, §9
- `PADRAO-ML-LOPES-DESIGN.md` §1
- Microsoft Learn: App notifications overview
  `https://learn.microsoft.com/en-us/windows/apps/develop/notifications/app-notifications/`
- Microsoft Learn: Quickstart: App notifications (Win32 unpackaged)
  `https://learn.microsoft.com/en-us/windows/apps/develop/notifications/app-notifications/app-notifications-quickstart`
- JNA: `https://github.com/java-native-access/jna`
- ADR 0001 (stack)
- ADR 0002 (sync — SSE para a web)
