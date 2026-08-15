# ADR 0001 — Stack final do Gestor Inteligente de Demandas

> **Vinculante.** Precedência #3.
> Decidido em 14/08/2026 (Fase 0).
> **Revisão 1 (mesmo dia):** o proprietário decidiu por **Java puro** (rompe com o padrão ML Lopes Design §2.1). Esta ADR passa a refletir a decisão do dono do produto e é vinculante.

---

## Status

Aceito — **revisão 1** substitui a versão JavaScript/Neutralino original.

## Contexto

O projeto exige (PROJETO §6, §15, §18):

- Aplicativo Windows instalável, com bandeja, segundo plano, notificações nativas, autostart.
- Aplicação web responsiva, mesma API.
- Sincronização entre múltiplos dispositivos, offline-first.
- Banco central relacional, auditável.
- Gateway de IA opcional.
- Instalador Windows profissional.
- Atualização por canal estável.
- LGPD.
- pt-BR.

O padrão ML Lopes Design (precedência #5) é vinculante para todos os produtos da marca, mas admite exceções pelo proprietário. Em 14/08/2026, o proprietário decidiu explicitamente: **Java puro**, refazendo a stack do zero para este produto (rompendo com §2.1 do padrão).

Demais pontos não-linguísticos do padrão permanecem vinculantes: zero dependência runtime no cliente (que aqui se traduz em **JRE embutido no instalador, controlado**), permissão no backend, regra de negócio pura testável, "offline é o normal", "IA não é dependência", "sem perda silenciosa", "atualização pela mesma forma do padrão §5".

## Decisão

### Linguagem e runtime

- **Linguagem: Java 21 LTS.** Records, pattern matching, sealed classes, virtual threads.
- **Build: Maven 3.9+** (preferido pelo ecossistema Windows).
- **JRE embarcado no instalador** (via `jlink` + `jpackage` + WiX). Tamanho esperado: 35-55 MB (runtime mínimo + app). Aceito o trade-off de tamanho pela consistência da decisão.
- **Alvo: Windows 11 64-bit.** x86_64.

### Desktop

| Componente | Escolha | Justificativa |
|---|---|---|
| UI | **JavaFX 21** (OpenJFX ou Liberica JDK Full) | Toolkit oficial; FXML + CSS; WebView baseado em WebKit (não precisa de WebView2) |
| Renderização local | `javafx.scene.web.WebView` (WebKit) | Incluso no JavaFX; dispensa dependência do Windows |
| Banco local | **Xerial SQLite JDBC 3.50+** (nativos embutidos no JAR) | Mesmo SQLite do servidor, type 4 driver, sem dependência externa |
| Empacotamento | **jpackage** (Java 14+, nativo) | Gera `.exe` autoinstalável com JRE embutido |
| Toolchain do instalador | **WiX 3.11** portátil em `tools/wix/` | Necessário para `jpackage --type msi` |
| Notificações | **JNA → `AppNotificationManager` (WinRT)** | Mesma API moderna da Microsoft usada na versão anterior; mais complexo em Java mas viável |
| Segundo plano | **TrayIcon do AWT** + serviço de usuário via `WinRun4J` ou `nssm` | Mantém a janela fechada; daemon em JVM separado |
| Logging | **SLF4J + Logback** | Padrão de fato em Java |
| Validação | **Hibernate Validator 8** (Bean Validation 3.0) | Padrão Jakarta; `@NotNull`, `@Size`, etc. |

### Servidor

| Componente | Escolha | Justificativa |
|---|---|---|
| HTTP | **Javalin 6.x** (estável) ou **Javalin 7.x** (mais novo) | Microframework leve sobre Jetty; simples; suficiente para nossa API |
| Banco | **Xerial SQLite JDBC 3.50+** + HikariCP | Mesmo engine do cliente; pool para servir concorrência |
| Migrações | **Flyway 10** (community) | Versionado, suporta SQLite, padrão de mercado |
| Auth | **argon2-jvm** (`de.mkammerer:argon2-jvm`) + cookie httpOnly+SameSite+Secure | argon2id; sessões server-side em tabela `sessoes` |
| Push | **SSE** (Javalin suporta nativamente via `sse()`) | HTTP/2 matou limite de 6 conexões; auto-reconnect |
| JSON | **Jackson 2.x** | Padrão de mercado em Java |
| Validação | **Hibernate Validator** + `jakarta.validation` | Compartilhado entre web e servidor |
| Logs | **SLF4J + Logback** com JSON encoder (`logstash-logback-encoder`) | Estruturado, correlation id |
| IA | **openai-java SDK oficial** (`com.openai:openai-java`) no servidor | Structured Outputs com `responseFormat` |
| Datas | `java.time` + fuso do usuário | API nativa moderna |

> **Decisão sobre ORM:** JDBC puro com `PreparedStatement` para todas as queries de negócio. **Sem Hibernate** (overhead desnecessário; queremos SQL explícito e auditável; migrações via Flyway são suficientes). Apenas Hibernate Validator para validação de DTOs.

### Web

| Componente | Escolha | Justificativa |
|---|---|---|
| Frontend | **HTML+CSS+JS puros** servido pelo Javalin (`Javalin.create(c -> c.staticFiles.add("/public"))`) | Mesma API do desktop; sem build |
| Renderização | Pelo navegador do usuário | Sem framework |
| Estado | Local + `fetch` | Vanilla JS, sem reatividade |

### Empacotamento e distribuição

| Componente | Escolha | Justificativa |
|---|---|---|
| Empacotamento desktop | **jpackage --type exe** com JRE mínimo via `jlink` | EXE autoinstalável; usuário não precisa de Java |
| Instalador alternativo | **jpackage --type msi** (gera `.msi` via WiX) | Para distribuição via GPO/Intune |
| AppUserModelID | Registrado via script PowerShell pós-instal | Necessário para toasts + Action Center |
| Atualização | **GitHub Releases** + `curl.exe` (via `ProcessBuilder`) + SHA-256 | Mesma forma do padrão §5 (ADR 0006) |
| Authenticode | Sem assinatura no MVP | Custo; manter enquanto não houver certificado |
| Repositório | `github.com/ml-lopes/gestor-inteligente-de-demandas` | Owner definido pelo AGENTS §1 |

### Diagrama

```
desktop/ (Maven module: app)
  ├── src/main/java/.../App.java          ← JavaFX Application
  ├── src/main/java/.../core/             ← regra pura (sem JavaFX, sem JDBC estático)
  ├── src/main/java/.../db/               ← wrapper Xerial SQLite JDBC
  ├── src/main/java/.../sync/             ← fila + version vector
  ├── src/main/java/.../notifications/    ← JNA → AppNotificationManager
  ├── src/main/resources/fxml/            ← telas JavaFX
  ├── src/main/resources/css/             ← tema dark+light (JavaFX CSS)
  └── pom.xml

server/ (Maven module: api)
  ├── src/main/java/.../Server.java       ← Javalin
  ├── src/main/java/.../core/             ← regra de negócio (espelha o desktop)
  ├── src/main/java/.../db/               ← Flyway + Xerial SQLite JDBC
  ├── src/main/java/.../ai/               ← gateway OpenAI
  ├── src/main/java/.../auth/             ← argon2-jvm + sessões
  ├── src/main/java/.../sync/             ← /api/sync/* (REST) + /sse/eventos
  ├── src/main/resources/db/migration/    ← Flyway SQL
  ├── src/main/resources/prompts/v1/      ← prompts versionados
  └── pom.xml

web/ (estático)
  ├── index.html
  ├── css/
  ├── js/
  └── assets/

installer/
  ├── wix/                                ← WiX 3.11 portátil
  └── resources/                          ← ícone .ico, license, banner
```

## Consequências

### Positivas

- Mesma linguagem do back ao front (no desktop); reaproveitamento de `core/` entre cliente e servidor.
- JRE embutido elimina o problema "Java não instalado" no cliente.
- `jpackage` produz EXE/MSI nativo do Windows; sem runtime externo visível.
- JDBC puro dá controle total sobre SQL; migrações via Flyway são testáveis.
- Javalin 6/7 é pequeno e rápido; deploy do servidor é um único `jar` executável.
- `jlink` permite runtime mínimo (35-55 MB) bem menor que um JDK completo (200+ MB).

### Negativas

- **Instalador de 35-55 MB** (vs ~5-20 MB do padrão ML Lopes com Neutralino). Aceito.
- **JNA + WinRT** é mais complexo que PowerShell direto. Mitigação: encapsular em uma classe `Notificador` com fallback `java.awt.TrayIcon.displayMessage` se JNA falhar.
- **JavaFX WebView** é baseado em WebKit, não Chromium. Pode divergir do Chrome em alguns detalhes. Mitigação: testes E2E em ambos os browsers.
- **Build mais lento** que JavaScript (~30-90s vs 1-3s). Mitigação: cache do Maven, build incremental.
- **Toolchain maior** (JDK + Maven + WiX + JNA). Documentado em `tools/`.
- **Quebra o padrão ML Lopes** — primeira exceção em todos os produtos da marca. Justificado pela decisão do proprietário.

### Neutras

- Migração entre versões Java (21 → 25 etc.) exige nova ADR.
- Hibernate Validator poderia ser dispensado (validação manual), mas Jakarta Bean Validation é padrão e tem baixo custo.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Manter JavaScript/Neutralino (proposta original) | Proprietário decidiu por Java. Refeito. |
| Electron + TypeScript | Quebra decisão do proprietário. |
| Java Swing (em vez de JavaFX) | UI mais pobre; sem WebView nativo; FX tem CSS e FXML. |
| Spring Boot | Pesado (40+ MB só de deps), opinionado demais para um caso pessoal. |
| Micronaut / Quarkus | Ótimos mas mais complexos. Javalin é mais simples. |
| Hibernate ORM | Overhead desnecessário; JDBC + Flyway dá controle total. |
| PostgreSQL no servidor | Complexidade operacional para uso pessoal; SQLite resolve. |
| Netty puro | Mais código para escrever; Javalin já usa Jetty (estável). |
| Helidon SE | Bom, mas Javalin tem mais tração e comunidade. |
| Build com Gradle | Funciona, mas Maven é mais universal em Windows. |
| Inno Setup / NSIS para o instalador | `jpackage` nativo é melhor integrado e gera MSI quando precisa. |

## Links

- `PROJETO-GESTOR-INTELIGENTE-DE-DEMANDAS.md` §6, §15, §18
- `PADRAO-ML-LOPES-DESIGN.md` §2.5 (proibições originais — exceção registrada)
- `PADRAO-ML-LOPES-DESIGN.md` §5 (forma de atualizar — mantida)
- `PADRAO-ML-LOPES-DESIGN.md` §3.4 (permissão no backend — mantida)
- `PADRAO-ML-LOPES-DESIGN.md` §4.2 (runVolatil → aqui: insertOrReplace em transação separada, com debounce)
- `PADRAO-ML-LOPES-DESIGN.md` §4.3 (gravação atômica: tmp → renomeia → move)
- ADR 0002 (sincronização — conceitual)
- ADR 0003 (banco — Xerial SQLite JDBC)
- ADR 0004 (IA — openai-java SDK)
- ADR 0005 (notificações — JNA + AppNotificationManager)
- ADR 0006 (atualização — GitHub Releases + curl + SHA-256)
