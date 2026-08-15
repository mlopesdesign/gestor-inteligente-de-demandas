# 06 — Estratégia de Notificações

> **Vinculante.** Precedência #1 (documento da Fase 1).
> Sem código de produto. Detalha o motor de cobrança, os canais de notificação e o fallback AWT.
> Independe de WebView2 — usa `AppNotificationManager` (WinRT) via JNA.
> Endurece o ADR 0005.

---

## 1. Princípios

1. **Notificação local do Windows é obrigatória e insubstituível.** Todos os outros canais são **complementares**.
2. **Cobrança contínua até decisão explícita.** Fechar a notificação ≠ concluir, adiar, bloquear ou cancelar.
3. **Tom configurável** (profissional, firme, gentil). Nunca ofensivo.
4. **Ações contextuais** na própria notificação (botões `Concluir`, `Adiar`, `Bloquear`, `Cancelar`).
5. **Funciona com janela fechada** (JVM continua; `ScheduledExecutorService` ativo; bandeja visível).
6. **Logs de auditoria** em cada envio, falha, ação.

## 2. Stack de notificações (independente de WebView2)

```mermaid
flowchart TD
    A[Tarefa/Lembrete] --> B{CobrancaService.decide()}
    B --> C[Insere em fila_notificacoes]
    C --> D[ScheduledExecutorService]
    D --> E{Janela fechada?}
    E -- não --> F[Mostra via JavaFX dialog overlay]
    E -- sim --> G{WinRT disponível?}
    G -- sim --> H[JNA -> AppNotificationManager.show]
    G -- não --> I[AWT SystemTray.displayMessage]
    H --> J[Action Center do Windows]
    I --> K[Bandeja com balloon]
    H --> L[User clica botão]
    I --> L
    L --> M{Ação?}
    M -- Concluir --> N[POST /api/v1/tarefas/{id}/concluir]
    M -- Adiar 15min --> O[Cria novo lembrete +15min]
    M -- Bloquear --> P[POST /api/v1/tarefas/{id}/status BLOQUEADA + motivo]
    M -- Cancelar c/ motivo --> Q[POST /api/v1/tarefas/{id}/cancelar]
    M -- Abrir --> R[Focus na janela JavaFX]
```

**Independência de WebView2**: o caminho da notificação **nunca** passa pelo WebView do JavaFX. Notificações são disparadas pelo `AppNotificationManager` (WinRT) que é API nativa do Windows 10/11 — completamente separada do motor de renderização. O JavaFX WebView só é usado se a UI interna do app embutir HTML (ex: ajuda); as notificações não dependem dele.

## 3. Comportamento por nível de cobrança

Cobrado por `CobrancaService.disparar(tarefa, nivelCobranca, politicaCobranca)` (ver `01-MODELO-DOMINIO.md` §7.2 para a estrutura de `Cobranca`).

### 3.1 Matriz

| Nível | Antecedência (min antes do vencimento) | Repetição após vencimento | Visual (WinRT) | Som | Ações no toast |
|---|---|---|---|---|---|
| **DISCRETA** | 60 | — | simples | não | "Abrir" |
| **PERSISTENTE** | 120, 60, 30, 0 | a cada 30min (max 5x) | borda amarela | sim (suave) | "Abrir", "Concluir", "Adiar 15min" |
| **INTENSIVA** | 240, 120, 60, 30, 0 | a cada 15min (max 20x) | borda vermelha | sim (médio) | "Abrir", "Iniciar agora", "Concluir", "Adiar 30min", "Reprogramar c/ motivo", "Bloquear" |
| **CRITICA** | 480, 240, 120, 60, 30, 0 | a cada 10min (até decisão) | banner persistente + ícone de marca | sim (alto) | "Abrir", "Iniciar agora", "Concluir", "Adiar 15min", "Reprogramar c/ motivo", "Bloquear", "Cancelar c/ motivo" |

### 3.2 Fechar ≠ concluir

`AppNotificationManager.Dismissed` é capturado por `WinRtNotificador`:

```java
void onDismissed(String tag) {
    // Marca `visualizada_em` na fila_notificacoes
    // NÃO muda status da tarefa
    // NÃO cancela próxima janela de cobrança
    // Próxima janela calculada por CobrancaService
}
```

### 3.3 Frequência mínima entre notificações da mesma tarefa

- Independente do nível: **mínimo 5 minutos** entre notificações da mesma tarefa (exceto CRÍTICA, que respeita o intervalo do nível).
- Justificativa: evitar spam quando o usuário fechou sem agir.

## 4. Tom da cobrança

Configurável em `usuarios.tom_cobranca` (default `PROFISSIONAL`).

### 4.1 Exemplos por tom e nível

| Nível / Tom | PROFISSIONAL | FIRME | GENTIL |
|---|---|---|---|
| DISCRETA — antecedência | "Tarefa vence em 1h." | "Atenção: prazo em 1h." | "Lembrete carinhoso: sua tarefa vence em 1h." |
| PERSISTENTE — vencimento | "Tarefa venceu. Decida: concluir, adiar ou bloquear." | "Tarefa venceu. Decida agora." | "Sua tarefa precisa de uma decisão. O que prefere?" |
| INTENSIVA — vencimento | "Tarefa CRÍTICA venceu. Ação imediata necessária." | "Tarefa CRÍTICA vencida. Resolva agora." | "Você está atrasado nesta tarefa importante. Como prosseguir?" |
| CRITICA — vencimento | "Esta tarefa exige decisão. Continua cobrando." | "Decida. Continua cobrando." | "Por favor, decida. Estamos aqui para ajudar." |

### 4.2 Com IA opcional

- `cobranca-texto` (rota IA) gera texto personalizado baseado no **tom + histórico do usuário** (não inclui dados confidenciais no prompt).
- Default: texto estático. IA só é chamada se `IA_HABILITADA=true` E o usuário não tiver desativado explicitamente o tom personalizado.
- Toda resposta da IA é validada por schema (tamanho, tom, ausência de palavras ofensivas) antes de exibir.

## 5. Canais

### 5.1 Hierarquia

1. **Windows Local** (AppNotificationManager via JNA, com fallback AWT) — **obrigatório**.
2. **SSE** para a web — **obrigatório**.
3. **E-mail** (Jakarta Mail) — opcional, configurável por usuário.
4. **Telegram** (Bot API via `java.net.http.HttpClient`) — opcional, configurável.
5. **WhatsApp** (provedor oficial) — fora do MVP, adaptador stub.
6. **Push web** (futuro) — fora do MVP.

### 5.2 Adaptador `NotificadorRemoto`

```java
public interface NotificadorRemoto {
    String nome();                                  // 'email' | 'telegram' | 'whatsapp'
    CompletableFuture<EnvioResultado> enviar(NotificacaoLembrete n);
    boolean habilitadoPara(Usuario u);
}
```

Servidor decide quais adaptadores usar baseado em `usuarios.canais_habilitados_json`. Cliente (desktop) **só** dispara Windows Local; web recebe via SSE.

### 5.3 Garantia de canal local

**Invariante**: mesmo se todos os canais externos falharem, o Windows Local é disparado. Cada `lembrete` é enfileirado **primeiro** na `fila_notificacoes` local (que o Windows Local consome) e **depois** enviado aos externos. Falha de externo não bloqueia local.

## 6. Janela fechada, segundo plano

### 6.1 Estratégia JVM

```java
@Override
public void start(Stage stage) {
    // ...
    Platform.setImplicitExit(false);  // JVM continua após fechar Stage
    ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);
    scheduler.scheduleAtFixedRate(this::processarFilaNotificacoes, 0, 30, TimeUnit.SECONDS);
    bandeja = new Bandeja(this);  // SystemTray + menu
    stage.setOnCloseRequest(e -> {
        e.consume();
        stage.hide();             // Esconde janela, JVM continua
        bandeja.mostrarMensagem("Continua em segundo plano", "Ícone na bandeja");
    });
}
```

### 6.2 Bandeja

`java.awt.SystemTray` com `TrayIcon` + `PopupMenu`:

- "Abrir Gestor" → restaura janela
- "Captura rápida" → abre modal de criação
- "Sair" → fecha app de verdade (com confirmação se há pendências)

### 6.3 Watchdog

- Se a JVM travar, o usuário reinicia pelo atalho.
- Crash não é recoverable automaticamente nesta versão; documentado.
- Logs locais registram o crash com stacktrace + `appdata/logs/crash-<timestamp>.log`.

## 7. Fila de notificações (cliente)

### 7.1 Schema

Já em `02-MODELO-DADOS.md` §3.1.10:

```sql
CREATE TABLE fila_notificacoes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  lembrete_id     TEXT NOT NULL,
  tarefa_id       TEXT NOT NULL,
  nivel           TEXT NOT NULL,
  titulo          TEXT NOT NULL,
  corpo           TEXT NOT NULL,
  botoes_json     TEXT NOT NULL,
  programada_para TEXT NOT NULL,
  entregue_em     TEXT,
  visualizada_em  TEXT,
  tentativas      INTEGER NOT NULL DEFAULT 0,
  ultimo_erro     TEXT
);
```

### 7.2 Consumo

`NotificadorScheduler` (thread daemon):

- A cada 30s, lê `fila_notificacoes` com `programada_para <= now() AND entregue_em IS NULL`.
- Para cada linha, dispara via `WinRtNotificador` (com fallback `AwtTrayNotificador`).
- Marca `entregue_em` em sucesso.
- Se falhar, incrementa `tentativas`, registra `ultimo_erro`. Após 3 falhas, marca como entregue (com `ultimo_erro` preenchido) para evitar loop.

## 8. Notificações externas (e-mail, Telegram)

### 8.1 E-mail (Jakarta Mail)

- Configurável por usuário: SMTP host, port, TLS, user, password (armazenado criptografado em `usuarios.smtp_config_json`).
- **Não** armazenar senha em claro. Criptografia via `javax.crypto` (AES-GCM) com chave derivada de `senha_hash` do usuário.
- Templates: `templates/email/lembrete.html` (Thymeleaf-like, ou só substituição de strings).

### 8.2 Telegram

- Bot único (registrado por Marcio com `@BotFather`).
- Usuário inicia conversa com o bot e envia `/vincular <codigo_gerado_pelo_app>`. Código expira em 10 min.
- Após vinculado, bot envia mensagens para o `chat_id` do usuário.
- Bot roda como **worker** no servidor: faz long-poll em `getUpdates` ou usa webhook.
- Mensagem inclui botões inline (CallbackQuery) com ações (limitado pelo Telegram).

## 9. Logs e auditoria

Cada evento de notificação gera registro em `auditoria`:

```json
{
  "acao": "notificacao_enviada",
  "diff_json": { "lembrete_id": "...", "canal": "WINDOWS_LOCAL", "nivel": "PERSISTENTE" }
}
```

Ações: `notificacao_enviada`, `notificacao_falhou`, `notificacao_acao`, `notificacao_dismissed`, `notificacao_canal_externo_habilitado`, `notificacao_canal_externo_desabilitado`.

## 10. Configuração pelo usuário

Tela Configurações → Notificações:

- Toggle por canal: Windows Local (sempre on), Web (sempre on), E-mail, Telegram, WhatsApp.
- Tom: Profissional / Firme / Gentil.
- Botão "Modo silencioso" (pausa todas por 1h, 4h, 8h, 24h, até data).
- Botão "Mostrar exemplo" (dispara uma notificação de teste).
- Lista de dispositivos (revogar).

## 11. Cross-references

- Domínio: `01-MODELO-DOMINIO.md` §7.
- Modelo de dados: `02-MODELO-DADOS.md` §3.1.10.
- API: `03-CONTRATOS-API.md` §14.
- Threat model: `05-THREAT-MODEL.md` §4.6.
- ADR 0005 (notificações AppNotificationManager + fallback AWT).
- ADR 0004 (IA opcional para tom personalizado).

---

*ML Lopes Design · Marcio · mlopesdesign@gmail.com*
*Fase 1 — Especificação e arquitetura — 14/08/2026.*
