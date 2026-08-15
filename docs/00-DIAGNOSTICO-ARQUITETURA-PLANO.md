# 00 — Diagnóstico · Arquitetura · Plano

> **Vinculante. Precedência #1 sobre os demais documentos.**
> Gerado em 14/08/2026 como Fase 0 do Gestor Inteligente de Demandas.
> **Revisão 1 (mesmo dia):** stack migrada para Java 21 LTS por decisão do proprietário. ADR 0001 revisão 1.

---

## Sumário

1. [Confirmação da raiz e estado do ambiente](#1-confirmação-da-raiz-e-estado-do-ambiente)
2. [Inventário de normativos lidos](#2-inventário-de-normativos-lidos)
3. [Hierarquia normativa e conflitos identificados](#3-hierarquia-normativa-e-conflitos-identificados)
4. [Matriz de requisitos e decisões de arquitetura](#4-matriz-de-requisitos-e-decisões-de-arquitetura)
5. [Estado da arte considerado](#5-estado-da-arte-considerado)
6. [Arquitetura definitiva](#6-arquitetura-definitiva)
7. [Modelo de dados (visão)](#7-modelo-de-dados-visão)
8. [Sincronização offline](#8-sincronização-offline)
9. [Motor de notificações](#9-motor-de-notificações)
10. [Segurança e LGPD](#10-segurança-e-lgpd)
11. [Atualização e instalador](#11-atualização-e-instalador)
12. [Observabilidade e auditoria](#12-observabilidade-e-auditoria)
13. [Plano de execução faseado](#13-plano-de-execução-faseado)
14. [Critérios objetivos de aceite por marco](#14-critérios-objetivos-de-aceite-por-marco)
15. [Riscos conhecidos e mitigações](#15-riscos-conhecidos-e-mitigações)
16. [Anexo A — pesquisa de estado da arte (resumo)](#anexo-a--pesquisa-de-estado-da-arte-resumo)
17. [Anexo B — glossário de identidade imutável](#anexo-b--glossário-de-identidade-imutável)

---

## 1. Confirmação da raiz e estado do ambiente

### 1.1 Raiz oficial

```
E:\Projetos\LOPES FOCUS\
```

Esta é a raiz confirmada no momento da abertura. Nenhuma subpasta de projeto existia antes desta Fase 0; toda a estrutura nova foi criada **nesta raiz** e nada foi alterado em diretórios externos.

### 1.2 Estado do ambiente (auditado em 14/08/2026)

| Componente | Versão detectada | Status |
|---|---|---|
| Node.js | 24.14.1 | OK (usado em ferramentas de build, smoke e CI) |
| npm | 11.11.0 | OK |
| Git | 2.55.0 (Windows) | OK |
| Python | 3.14.6 | OK (utilitários auxiliares) |
| PowerShell | 7.6.4 | OK |
| curl.exe | nativo do Windows | OK |
| **JDK 21 LTS** | **a instalar** | Necessário para `mvn` e `jpackage` |
| **Maven 3.9+** | **a instalar** | Necessário para build |
| **WiX 3.11** | **ausente** | Portátil em `tools/wix/` |
| 7z / Ghostscript | ausentes | Não-bloqueantes |

> A **não** instalação automática de ferramentas está alinhada ao padrão de conduta. O JDK será baixado (Liberica JDK Full 21 com JavaFX embutido) e extraído em `tools/jdk/`. Maven em `tools/maven/`. WiX em `tools/wix/`. Nada no sistema.

### 1.3 Estrutura de pastas (pré-Fase 0)

```
E:\Projetos\LOPES FOCUS\
├── PADRAO-ML-LOPES-DESIGN.md
├── PROJETO-GESTOR-INTELIGENTE-DE-DEMANDAS.md
├── AGENTS.md                        ← criado nesta Fase 0
└── docs/                            ← criado nesta Fase 0
    ├── 00-DIAGNOSTICO-ARQUITETURA-PLANO.md  ← este documento
    ├── MATRIZ-RASTREABILIDADE.md
    ├── adr/                         ← 6 ADRs criados nesta Fase 0
    └── manuais/
```

---

## 2. Inventário de normativos lidos

| # | Arquivo | Lido integralmente | Observação |
|---|---|---|---|
| 1 | `PADRAO-ML-LOPES-DESIGN.md` | ✅ (30.646 bytes) | Filosofia + regras de ouro. **§2.1 com exceção registrada em ADR 0001.** |
| 2 | `PROJETO-GESTOR-INTELIGENTE-DE-DEMANDAS.md` | ✅ (26.539 bytes) | Especificação mestra. Precedência #4. |
| 3 | `AGENTS.md` (criado nesta Fase 0) | ✅ | Governança local do projeto. |
| 4 | `docs/00-DIAGNOSTICO-ARQUITETURA-PLANO.md` (este) | ✅ | Precedência #1. |
| 5 | `docs/MATRIZ-RASTREABILIDADE.md` | ✅ | Precedência #2. |
| 6 | `docs/adr/0001-stack-final.md` | ✅ | ADR. Revisão 1 = Java. |
| 7 | `docs/adr/0002-sincronizacao-lww-versionado.md` | ✅ | ADR. |
| 8 | `docs/adr/0003-banco-sqlite-ponto-unico.md` | ✅ | ADR. Xerial SQLite JDBC. |
| 9 | `docs/adr/0004-ia-gateway-versionado.md` | ✅ | ADR. openai-java. |
| 10 | `docs/adr/0005-notificacoes-webview2.md` | ✅ | ADR. JNA + AppNotificationManager + fallback AWT. |
| 11 | `docs/adr/0006-atualizacao-online.md` | ✅ | ADR. Mesma forma do padrão §5. |

Nenhum outro documento normativo existe na raiz.

---

## 3. Hierarquia normativa e conflitos identificados

### 3.1 Hierarquia

```
1. docs/00-DIAGNOSTICO-ARQUITETURA-PLANO.md  ← este (precedência mais alta)
2. docs/MATRIZ-RASTREABILIDADE.md
3. docs/adr/*.md
4. PROJETO-GESTOR-INTELIGENTE-DE-DEMANDAS.md
5. PADRAO-ML-LOPES-DESIGN.md
```

Quando dois documentos divergirem, prevalece o de menor número. Conflitos residuais são registrados em ADR.

### 3.2 Conflitos identificados e resolvidos

| # | Tensão | Decisão | ADR |
|---|---|---|---|
| C1 | **PROJETO** (uso individual multi-dispositivo) exige sincronização. **PADRÃO** §2.4 recomenda outra arquitetura para "muitas pessoas". | Uso pessoal + sync entre 2-5 dispositivos do mesmo dono. Mantém o padrão. Servidor central Java + SQLite local no desktop. | 0003 |
| C2 | **PROJETO** §6.3 admite canais externos. **PADRÃO** silencioso sobre isso. | Canais externos são **adaptadores opcionais** atrás de interface Java `NotificadorRemoto`. **Nenhum** substitui a notificação local do Windows. | 0005 |
| C3 | **PROJETO** §13 exige gateway de IA, mas também que IA nunca seja dependência. **PADRÃO** §1 proíbe dependências runtime no cliente. | Gateway de IA **só no servidor** com `openai-java`; cliente **nunca** carrega SDK. Chave em env var do servidor. | 0004 |
| C4 | **PROJETO** §14 exige sync robusto. **PADRÃO** §4 descreve "um dono do banco". | Sincronização **LWW com version vector** + fila idempotente. Conflito em campo crítico abre UI de resolução. | 0002 |
| C5 | **PROJETO** §6.1 exige execução em segundo plano. **PADRÃO** §5 já documenta atualização. | JVM com `Platform.setImplicitExit(false)` mantém a aplicação viva após fechar janela. Bandeja via `java.awt.SystemTray`. Notificações via JNA + `AppNotificationManager` WinRT, com fallback AWT. | 0005 |
| C6 | **PROJETO** §5.1 diz uso individual. **PROJETO** §16 e **PADRÃO** §3.5 pedem autenticação. | Auth com **argon2-jvm** + cookie httpOnly+SameSite+Secure, sessões server-side com revogação, dispositivos registrados. | 0001 |
| C7 | **PROJETO** §13 cita OpenAI Structured Outputs. **PADRÃO** §2.5 proíbe deps no cliente. | Cliente **nunca** tem SDK OpenAI. Dependência é só do servidor. | 0004 |
| **C8** | **Proprietário decidiu por Java puro**, quebrando PADRÃO §2.1. | **Exceção registrada** em ADR 0001 revisão 1. Java 21 LTS com JRE embutido no instalador (35-55 MB, aceito). Demais pontos do padrão permanecem vinculantes. | 0001 (rev 1) |

### 3.3 Lacunas que o proprietário precisará decidir (registradas, **não bloqueiam Fase 1**)

| # | Lacuna | Padrão em caso de omissão |
|---|---|---|
| L1 | Domínio definitivo e provedor do servidor | Sugestão: VPS pessoal (Salgueiro já roda nesse modelo). Sem domínio público no MVP. |
| L2 | Política de retenção de log e de anexos | Padrão conservador: 180 dias para logs; anexos ficam até exclusão manual. |
| L3 | Assinatura de código (Authenticode) | Sem assinatura no MVP. `jpackage` gera EXE não-assinado. SmartScreen pode alertar — documentar. |
| L4 | Comercialização | PROJETO §5.2 pede arquitetura preparada; MVP é individual. `dono_id` em toda tabela. |
| L5 | Provedor de e-mail e mensageria | Começar **sem** canais externos. Adaptadores Jakarta Mail + Telegram Bot API prontos mas desligados. |
| L6 | Política de cobrança da API OpenAI | Sem limite duro. Limite mensal configurável no servidor com fallback gracioso. |

---

## 4. Matriz de requisitos e decisões de arquitetura

A matriz completa está em `docs/MATRIZ-RASTREABILIDADE.md`. Este sumário mostra a correspondência **requisito → ADR → fase de entrega**.

| Bloco | Requisito | ADR / decisão | Fase |
|---|---|---|---|
| Captura rápida | Caixa de entrada com 1 texto, atalho global | 0001 | F3 |
| Captura NL | Linguagem natural → estruturado, com confirmação | 0004 | F6 |
| Tarefas | Modelo completo (status, prioridade, cobrança, recorrência, dependências) | 0003 | F3 |
| Subtarefas / checklist | Ordenação, status, prazo opcional | 0003 | F3 |
| Áreas / Clientes / Projetos | Cadastros livres com isolamento por usuário | 0003 | F3 |
| Lembretes e cobrança | Modos discreto, persistente, intensivo, crítico; ações na notificação | 0005 | F4 |
| Recorrência | Geração de ocorrências sem apagar histórico | 0002 | F4 |
| Visualizações | Hoje, próximas ações, calendário (dia/semana/mês/ano), projetos, busca, painel | 0001 | F3 |
| Revisões | Abertura do dia, encerramento, semanal | 0001 | F4 |
| Auditoria | Eventos de criação, edição, prazo, conclusão, sync, falha | 0003 | F3 |
| Sincronização | Fila local, versionamento, conflitos com tela de resolução, SSE para push | 0002 | F5 |
| Operação offline | Banco local + fila + resolução idempotente | 0002 | F5 |
| Segundo plano | JVM persistente + bandeja AWT + AppUserModelID + JNA → WinRT | 0005 | F4 |
| IA opcional | Gateway no servidor (openai-java), prompt versionado, schema validado | 0004 | F6 |
| Web responsiva | Mesma API; HTML+CSS+JS puros servidos pelo Javalin | 0001 | F2 |
| Atualização | GitHub Releases + curl + SHA-256 + version > atual | 0001 | F7 |
| Instalador | jpackage + WiX 3.11 portátil, EXE/MSI com JRE embutido | 0001 | F7 |
| Segurança | argon2id, sessões revogáveis, cookies httpOnly+SameSite+Secure, HTTPS obrigatório fora de localhost, Helmet equivalente, rate limit, CORS fechado, LGPD | — | F2 |
| Backup | `gestor_central.db` snapshot diário + WAL, retenção configurável, validação de integridade, teste de restauração documentado | 0003 | F5 |
| Testes | Unit, integração, sync, recorrência, migração, contrato, smoke, instalador, e2e | — | contínua |

---

## 5. Estado da arte considerado

Pesquisa de fontes oficiais (Microsoft Learn, OpenAI Developers, Javalin docs, Xerial SQLite JDBC, jpackage, JavaFX docs) e/ou comunidades técnicas respeitadas, em 14/08/2026.

### 5.1 Decisões e versões confirmadas

- **Java 21 LTS** — versão mais recente LTS; records, pattern matching, virtual threads. Suporte até 2031.
- **JavaFX 21** — separável do JDK desde Java 11. Liberica JDK Full inclui JavaFX embutido. OpenJFX como dependência Maven também funciona.
- **Javalin 6.x (estável) ou 7.x (mais novo)** — microframework sobre Jetty. Leve (~8k linhas), OpenAPI via plugin, SSE nativo, virtual threads opt-in.
- **Xerial SQLite JDBC 3.50.3+** — Type 4 driver; bundle único com nativos para Windows/Mac/Linux (x86, x86_64, ARM, ARM64) extraídos no tempdir. Suporta GraalVM native-image desde 3.40.1.0.
- **Flyway 10 community** — migrações versionadas, suporta SQLite, padrão de mercado.
- **HikariCP 5.x** — pool JDBC rápido, padrão de mercado.
- **Jackson 2.x** — JSON, padrão em Java.
- **Hibernate Validator 8.x** — Bean Validation 3.0 (Jakarta). Validação declarativa com anotações.
- **argon2-jvm 2.x** — `de.mkammerer:argon2-jvm`. argon2id.
- **JNA 5.x** — ponte Java ↔ nativo. Permite chamar WinRT (com cuidado) sem C++/WinRT.
- **AppNotificationManager (WinRT)** — API atual recomendada pela Microsoft para Win32 unpackaged. Substitui UWP `ToastNotificationManager`. Funciona com AppUserModelID registrado; permite botões de ação.
- **openai-java SDK oficial** — `com.openai:openai-java`. Suporta `responseFormat` Structured Outputs.
- **jpackage** (Java 14+) — gera `.exe` ou `.msi` com JRE embutido. Requer WiX 3.11 no PATH (Windows). Runtime mínimo via `jlink` (~30-50 MB).
- **SSE** para push web — auto-reconnect, HTTP/2 matou limite de 6 conexões; mais simples que WebSocket para o caso (notificações unidirecionais).
- **Sync offline** — LWW com version vector + fila idempotente. CRDT (Yrs, Automerge-java) é overkill aqui; LWW resolve 99% dos conflitos e abre UI para o que importa.

### 5.2 Princípios mantidos do padrão ML Lopes (apenas os que não dependem da linguagem)

1. Regra de negócio pura, primeiro parâmetro `db`/`DataSource`/`Connection`.
2. Permissão no backend, nunca só na tela.
3. IA não é dependência estrutural.
4. Offline é o normal.
5. Cobrança contínua até decisão explícita.
6. Sem perda silenciosa.
7. Nenhum segredo no cliente (chave OpenAI em env do servidor).
8. LGPD (exportar/apagar).
9. Testar caminho mínimo + migração sobre banco antigo.
10. Bump de versão a cada build (6 lugares sincronizados).
11. Documentação na mesma entrega.
12. Diagnóstico cita arquivo:linha.

### 5.3 Dependências aprovadas (servidor, em `server/pom.xml`)

| GroupId:ArtifactId | Versão | Uso |
|---|---|---|
| `io.javalin:javalin` | 6.x ou 7.x | HTTP server + roteamento |
| `org.xerial:sqlite-jdbc` | 3.50+ | Driver SQLite |
| `com.zaxxer:HikariCP` | 5.x | Pool de conexões |
| `org.flywaydb:flyway-core` | 10.x | Migrações |
| `org.flywaydb:flyway-sqlite` | 10.x | Suporte SQLite |
| `de.mkammerer:argon2-jvm` | 2.x | Hash de senha |
| `com.openai:openai-java` | 4.x | Gateway de IA (apenas servidor) |
| `com.fasterxml.jackson.core:jackson-databind` | 2.x | JSON |
| `org.hibernate.validator:hibernate-validator` | 8.x | Bean Validation |
| `org.glassfish.expressly:expressly` | 5.x | Implementação Jakarta EL |
| `org.slf4j:slf4j-api` | 2.x | Logging API |
| `ch.qos.logback:logback-classic` | 1.5+ | Logging impl |
| `net.logstash.logback:logstash-logback-encoder` | 8.x | JSON encoder |
| `com.sun.mail:jakarta.mail` | 2.x | SMTP (e-mail, opcional) |
| `com.github.f4b6a3:ulid-creator` | 5.x | ULID |
| `junit:junit` | 5.x | Testes |

### 5.4 Dependências aprovadas (cliente, em `desktop/pom.xml`)

| GroupId:ArtifactId | Versão | Uso |
|---|---|---|
| `org.openjfx:javafx-controls` | 21 | UI |
| `org.openjfx:javafx-fxml` | 21 | FXML |
| `org.openjfx:javafx-web` | 21 | WebView (WebKit) |
| `org.openjfx:javafx-graphics` | 21 | Rendering |
| `org.xerial:sqlite-jdbc` | 3.50+ | Banco local |
| `net.java.dev.jna:jna` | 5.x | Ponte nativa |
| `net.java.dev.jna:jna-platform` | 5.x | Plataforma |
| `com.fasterxml.jackson.core:jackson-databind` | 2.x | JSON (sync) |
| `org.slf4j:slf4j-api` + logback | idem | Logs |
| `com.github.f4b6a3:ulid-creator` | 5.x | ULID |
| `junit:junit` | 5.x | Testes |

> Sem `node_modules`. Sem dependência web no cliente. Tudo via Maven.

---

## 6. Arquitetura definitiva

### 6.1 Diagrama de blocos

```
┌──────────────────────────────────────────────────────────┐
│  Computador 1 (Windows 11)        Computador 2 (Windows)│
│  ┌──────────────────────────┐    ┌────────────────────┐  │
│  │ GestorInteligenteDeDe-   │    │  mesma aplicação   │  │
│  │ mandas.exe (jpackage+JRE)│    │                    │  │
│  │  ├ JavaFX (UI)           │    │                    │  │
│  │  ├ WebView WebKit (HTML) │    │                    │  │
│  │  ├ Xerial SQLite (local) │    │                    │  │
│  │  ├ Fila offline (JDBC)   │    │                    │  │
│  │  ├ JNA → AppNotif (WinRT)│   │                    │  │
│  │  └ SystemTray (bandeja)  │    │                    │  │
│  └──────────┬───────────────┘    └─────────┬──────────┘  │
│             │                              │             │
│             └──────────────┬───────────────┘             │
│                            │ HTTPS                      │
│                            ▼                             │
│                ┌──────────────────────────┐              │
│                │ Servidor central (Java)  │              │
│                │  Javalin 6/7 (Jetty)     │              │
│                │  ├ /api/*   (REST)       │              │
│                │  ├ /sse     (push)       │              │
│                │  ├ /web     (estático)   │              │
│                │  ├ Xerial SQLite (WAL)   │              │
│                │  ├ HikariCP (pool)       │              │
│                │  ├ Flyway (migrations)   │              │
│                │  ├ IA Gateway ──► OpenAI │              │
│                │  ├ SMTP/Telegram adapter │              │
│                │  └ Worker recorrências   │              │
│                └─────────┬────────────────┘              │
│                          │                               │
│                          ▼                               │
│              ┌──────────────────────────┐                │
│              │ gestor_central.db (WAL)  │                │
│              │ backups/ (snapshot+SHA)  │                │
│              └──────────────────────────┘                │
│                                                          │
│  GitHub Releases: instalador + ZIPs portáteis + hashes   │
└──────────────────────────────────────────────────────────┘
```

### 6.2 Camadas

| Camada | Tecnologia | Onde |
|---|---|---|
| Apresentação (desktop) | JavaFX 21 + FXML + CSS | `desktop/src/main/java/.../ui/` + `resources/fxml/`, `resources/css/` |
| Apresentação (web) | HTML+CSS+JS puros | `web/` (servido pelo mesmo servidor Javalin) |
| API central | Javalin 6/7 + Jackson + Hibernate Validator | `server/src/main/java/.../api/Server.java`, `routes/*` |
| Regra de negócio | Java puro, função/método puro com `DataSource` ou `Connection` como 1º parâmetro | `server/.../core/*` e `desktop/.../core/*` (regras espelhadas para offline) |
| Banco central | Xerial SQLite JDBC + HikariCP + Flyway | `server/src/main/java/.../db/` |
| Banco local | Xerial SQLite JDBC direto | `desktop/src/main/java/.../db/` |
| Sincronização | Fila idempotente + version vector | `server/.../sync/*` e `desktop/.../sync/*` |
| Notificações (cliente) | JNA → WinRT `AppNotificationManager` + fallback AWT | `desktop/.../notifications/` |
| Notificações (canais externos) | Adaptadores (Jakarta Mail, Telegram) | `server/.../notifications/` |
| IA | `openai-java` SDK no servidor | `server/.../ai/` (cliente não tem SDK) |
| Empacotamento desktop | `jpackage` (Java 14+) com JRE mínimo via `jlink` | `desktop/target/installer/` |
| Instalador | jpackage → `.exe` ou `.msi` (via WiX 3.11 portátil) | `installer/` |
| Distribuição | GitHub Releases | repo `ml-lopes/gestor-inteligente-de-demandas` |
| Observabilidade | SLF4J + Logback + logstash-encoder (server) + logback (desktop) | `server/.../observability/`, `desktop/.../observability/` |

### 6.3 Porta única entre UI e regra

```java
api.chamar("tarefas:criar", payload)            // desktop → servidor local (em processo)
api.chamar("/api/tarefas:criar", payload)        // web → fetch('/api/...')
api.chamar("/api/sync/empurrar", fila)           // desktop → fetch('/api/sync/empurrar')
api.sse("/sse/eventos", canal)                  // web → EventSource
```

A UI nunca decide o transporte. A classe `Api.java` decide (mesma lógica do padrão ML Lopes §3.3, transposta para Java).

### 6.4 Permissão no backend

Toda rota do Javalin passa por `before("/api/*", ...)` que valida sessão + `PERM_ROTA[rota]`. UI também esconde, mas só conforto. Sessão sempre validada.

---

## 7. Modelo de dados (visão)

Schema completo será escrito na Fase 2 (F2), antes da primeira tela. Abaixo, **visão** com nomes de tabela, colunas-chave e índices. Cada tabela carrega `id TEXT` (ULID via `ulid-creator`), `criado_em`, `atualizado_em`, `versao INTEGER` (LWW), `dono_id TEXT` (isolamento por usuário), `cliente_id TEXT` (id do dispositivo que originou).

### 7.1 Núcleo

| Tabela | Função | Colunas-chave |
|---|---|---|
| `usuarios` | Conta | `email UNIQUE`, `senha_hash`, `nome`, `fuso`, `horario_trabalho_json`, `politicas_json`, `ia_habilitada` |
| `sessoes` | Sessões server-side | `usuario_id`, `token_hash`, `expira_em`, `revogada_em` |
| `dispositivos` | Aparelhos autorizados | `usuario_id`, `nome`, `sistema`, `app_versao`, `ultimo_acesso_em`, `revogado_em` |
| `areas` | Agrupamento livre | `usuario_id`, `nome`, `cor`, `ordem` |
| `clientes` | Contatos | `usuario_id`, `nome`, `organizacao`, `contatos_json`, `observacoes`, `status` |
| `projetos` | Projeto | `usuario_id`, `titulo`, `descricao`, `cliente_id?`, `area_id?`, `status`, `prioridade`, `inicio_em`, `fim_em`, `progresso_calc` |
| `tarefas` | Tarefa principal | `usuario_id`, `titulo`, `descricao`, `area_id?`, `projeto_id?`, `cliente_id?`, `status`, `prioridade`, `nivel_cobranca`, `inicio_em?`, `vencimento_em?`, `duracao_estimada_min?`, `duracao_realizada_min?`, `recorrencia_json?`, `etiquetas_json`, `responsavel?`, `origem`, `concluida_em?`, `entregue_em?`, `confirmada_em?`, `motivo_cancelamento?`, `motivo_adiamento?` |
| `subtarefas` | Checklist interno | `tarefa_id`, `titulo`, `ordem`, `concluida_em?` |
| `dependencias` | Grafo | `tarefa_id`, `depende_de_id` |
| `anexos` | Arquivos e links | `tarefa_id`, `caminho_local?`, `url_externa?`, `mime`, `tamanho_bytes`, `sha256` |
| `lembretes` | Lembrete programado | `tarefa_id`, `momento`, `canal`, `recorrencia_json`, `estado`, `tentativas`, `ultimo_erro` |
| `recorrencias_ocorrencias` | Tarefas-filhas geradas | `tarefa_pai_id`, `tarefa_filho_id`, `data_referencia` |
| `auditoria` | Eventos | `usuario_id`, `entidade`, `entidade_id`, `acao`, `diff_json`, `dispositivo_id`, `em` |
| `ia_telemetria` | Telemetria de IA | `usuario_id`, `rota`, `prompt_versao`, `modelo`, `tokens_in`, `tokens_out`, `custo_usd`, `latencia_ms`, `status`, `erro`, `criado_em` |
| `sync_fila` (cliente) | Fila de saída | `op`, `tabela`, `id`, `payload_json`, `criado_em`, `tentativas` |
| `sync_cursors` (cliente e servidor) | Última versão conhecida | `usuario_id`, `dispositivo_id`, `tabela`, `versao` |
| `fila_notificacoes` (cliente) | Fila de notificações a disparar | ver ADR 0005 |
| `flyway_schema_history` | controle Flyway | (automático) |

### 7.2 Regras de schema

- `id` é ULID (26 chars) — ordenável, sem colisão, sem expor cardinalidade.
- `versao INTEGER NOT NULL DEFAULT 1` em toda entidade replicada; incrementado a cada update.
- Toda tabela de negócio tem `dono_id` (multi-tenant-ready, conforme PROJETO §5.2).
- `CHECK` para enums (`status`, `prioridade`, `nivel_cobranca`).
- Toda migração testada sobre **banco no formato antigo** (princípio 10 do AGENTS).
- `auditoria` append-only, sem UPDATE nem DELETE.

---

## 8. Sincronização

ADR 0002. Resumo:

### 8.1 Princípios

1. **Offline é o normal.** A fila local existe por padrão.
2. **LWW com version vector** resolve 99% dos conflitos. UI só abre quando há colisão em campo crítico (status, vencimento, responsável).
3. **Idempotência por `id` + `versao`**. Repetição é segura.
4. **Sem sobrescrita silenciosa.** Conflito detectado = tela de resolução OU log em auditoria.
5. **Sincronização é otimização**, não pré-requisito.

### 8.2 Fluxo

```
Cliente                          Servidor (Javalin)
  │                                  │
  ├─ criar/editar tarefa             │
  │  └─ INSERT local + push fila     │
  │                                  │
  │  POST /api/sync/empurrar ──────► │
  │    {ops: [...]}                  │
  │                                  ├─ aplica cada op (transação JDBC)
  │                                  ├─ se conflito: registra auditoria
  │                                  ├─ devolve cursor novo
  │  ◄── {ok, versao_por_tabela} ────┤
  │                                  │
  │  GET /api/sync/puxar?cursor=...  │
  │  ──────────────────────────────► │
  │  ◄── {ops: [...]} ───────────────┤
  │  aplica + atualiza cursor        │
  │                                  │
  │  SSE /sse/eventos ◄──────────────┤  push em tempo real
  │  (web e desktop com fila)        │
```

### 8.3 Resolução de conflito (UX)

- Mesmo campo editado em dispositivos diferentes → **tela lado-a-lado** com "manter A / manter B / mesclar".
- Campos diferentes → mescla silenciosa, com log.
- Deleção concorrente → tombstone (mantém versão lógica por 30 dias).

### 8.4 Periodicidade

- Empurrar: imediato (em background) + retry com backoff (5s, 30s, 2min, 10min).
- Puxar: imediato após empurrar + periódico 60s quando online + SSE para empurrar proativamente.
- Offline detectado por `java.net.NetworkInterface` (cliente) + tentativa periódica de `HttpClient.send` ao `/api/ping`.

---

## 9. Motor de notificações

ADR 0005. Resumo:

### 9.1 Hierarquia

1. **Notificação local do Windows** (JNA → `AppNotificationManager` WinRT, com fallback AWT) — **obrigatória e insubstituível**.
2. **SSE** para a web.
3. **E-mail** (opcional, Jakarta Mail).
4. **Telegram** (opcional, via Bot API).
5. WhatsApp, push web, push móvel ficam como **adaptadores** atrás da interface `NotificadorRemoto`.

### 9.2 Comportamento por nível de cobrança (PROJETO §9.2)

| Nível | Antecedência | Intervalo de repetição | Visual (WinRT) | Ações (botões no toast) |
|---|---|---|---|---|
| Discreta | 1h, no vencimento | não repete | simples | Abrir |
| Persistente | 2h, 1h, 30min, no vencimento, +30min | 30min até decisão | borda amarela | Abrir, Concluir, Adiar 15min |
| Intensiva | 4h, 2h, 1h, 30min, no vencimento, +15min, +1h | 15min até decisão | borda vermelha + som | Abrir, Iniciar agora, Concluir, Adiar, Reprogramar c/ motivo, Bloquear |
| Crítica | 8h, 4h, 2h, 1h, 30min, no vencimento, +10min, +30min, +1h, +2h | 10min até decisão | banner persistente + som + ícone de marca | todas acima + Cancelar c/ motivo |

**Fechar a notificação ≠ concluir.** Continua cobrando.

### 9.3 Tom da cobrança

Configurável: profissional, firme, gentil. Frases curtas. Nunca ofensiva. Padrão inicial: profissional.

### 9.4 Execução em segundo plano

- Janela JavaFX pode ser fechada; JVM continua (via `Platform.setImplicitExit(false)`).
- `java.awt.SystemTray` mantém o ícone na bandeja.
- `ScheduledExecutorService` (thread daemon) continua disparando notificações.
- Se o usuário quiser "iniciar com o Windows", o instalador (via script PowerShell pós-instal) cria chave em `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` apontando para o .exe do jpackage. Configurável.

---

## 10. Segurança e LGPD

| Item | Implementação |
|---|---|
| Senha | argon2id (de.mkammerer) com m=64MB, t=3, p=4 |
| Sessão | Cookie `httpOnly`, `SameSite=Lax`, `Secure` (em prod), `Path=/`, server-side em `sessoes` com revogação |
| Força bruta | Rate limit por IP e por usuário (filtro Javalin custom ou bucket4j) |
| HTTPS | Obrigatório fora de localhost. Certificado via Caddy/Nginx no servidor |
| Cabeçalhos | Helmet-equivalente (CSP, X-Frame-Options, HSTS em prod, X-Content-Type-Options) via filtro Javalin |
| CORS | Whitelist de origens (web) |
| CSRF | Cookie SameSite=Lax + token em header `X-CSRF-Token` para mutações web |
| Injeção | Prepared statements sempre (Xerial JDBC) + validação com Hibernate Validator |
| Segredos | Apenas em variáveis de ambiente no servidor; zero no JAR distribuído. Verificado por `grep` no build |
| Auditoria | Tabela `auditoria` append-only; retenção 180 dias |
| Exportar dados próprios | `GET /api/usuario/exportar` → JSON + SQLite zipado |
| Apagar conta | `POST /api/usuario/apagar` (LGPD art. 18) — soft delete 30 dias + hard delete após |
| Dependências | `mvn dependency-check` + `mvn versions:display-dependency-updates`; revisão periódica |
| Backup | Snapshot diário + SHA-256 + validação de integridade; cópia fora da VPS |
| Logs | Sem dados sensíveis (mascarar e-mail, nome, conteúdo); manter apenas IDs e ações |

---

## 11. Atualização e instalador

### 11.1 Instalador (jpackage + WiX 3.11)

- Gera `gestor-X.Y.Z-setup.exe` (jpackage `--type exe`).
- Opcionalmente gera `gestor-X.Y.Z.msi` (jpackage `--type msi`, requer WiX).
- Inclui JRE mínimo via `jlink` (~30-50 MB).
- Registra **AppUserModelID** `app.mllopes.gestor` via script PowerShell pós-instal.
- Atalhos: Menu Iniciar, Desktop (opcional), Autostart (opcional).
- Desinstalador limpo (jpackage gera automaticamente).
- Preserva `%APPDATA%` (dados do usuário).

### 11.2 Atualização

- App pergunta a `api.github.com/repos/ml-lopes/gestor-inteligente-de-demandas/releases/latest` via `HttpClient` Java (apenas JSON pequeno).
- Compara `tag_name` com versão local. Só oferece se **maior** (semver).
- Backup de `%APPDATA%\...\` antes de qualquer coisa. Aborta se backup falhar.
- `ProcessBuilder` executa `C:\Windows\System32\curl.exe` para baixar o instalador em `%TEMP%`.
- Verifica SHA-256 do asset contra `SHA256SUMS.txt` da release (calculado em Java).
- Fecha o app, executa o instalador com `/S` (silent), relança.

### 11.3 Release (artefatos)

- `gestor-X.Y.Z-setup.exe` (instalador EXE com JRE)
- `gestor-X.Y.Z.msi` (instalador MSI)
- `gestor-X.Y.Z-portable.zip` (versão portável para devs/avaliação)
- `SHA256SUMS.txt` com hash de cada arquivo
- `RELEASES.md` com notas (formato do padrão §5.3)
- `Source code (zip)` e `Source code (tar.gz)` (automático do GitHub)

---

## 12. Observabilidade e auditoria

- **Logs estruturados** (JSON) com `correlationId` por requisição (via MDC do SLF4J).
- **Ciclo de envio de notificação** registrado: `criado → enfileirado → entregue → confirmado/falhou`.
- **Diagnóstico de sincronização** visível em Configurações → Sync: cursor por tabela, ops pendentes, último erro.
- **Relatório de suporte exportável** (zip com `diagnostico.json` + log do dia + estado do banco).
- **Modo diagnóstico** ativável por variável `GESTOR_DEBUG=1` mostra stack traces no console.
- **Mascaramento** automático de campos sensíveis nos logs.

---

## 13. Plano de execução faseado

Cada fase é **entregável autônomo** (build + testes + tag). Não há "MVP" — só produto em evolução.

### Fase 0 — Governança e descoberta ✅
**Entregue nesta sessão (14/08/2026):**
- Auditoria da raiz.
- Leitura integral dos normativos.
- Matriz de rastreabilidade.
- Pesquisa de estado da arte.
- 6 ADRs vinculantes (incluindo ADR 0001 com revisão Java).
- AGENTS.md com identidade imutável e stack pinned.
- `docs/00-DIAGNOSTICO-ARQUITETURA-PLANO.md` (este).

### Fase 1 — Especificação e arquitetura
**Entregáveis:**
- `docs/MODELO-DOMINIO.md` (visão de classes e invariantes).
- `docs/MODELO-DADOS.md` (schema completo DDL + índices).
- `docs/CONTRATOS-API.md` (OpenAPI 3.1, gerado por `tools/gen-openapi.mjs` lendo o Javalin).
- `docs/POLITICA-SYNC.md` (algoritmo detalhado).
- `docs/THREAT-MODEL.md`.
- `docs/ESTRATEGIA-NOTIFICACOES.md` (matriz de cobrança detalhada).
- `docs/ESTRATEGIA-INSTALACAO.md` (jpackage + WiX detalhado).
- Protótipo visual FXML **como validação**, não entrega.
- `tools/gen-graphify.mjs` (gera `GRAPHIFY.md`).

**Aceite:** 7 documentos revisados e versionados. Nenhuma linha de código de produto.

### Fase 2 — Fundação técnica
**Entregáveis:**
- Repositório inicial + `git remote` para `ml-lopes/gestor-inteligente-de-demandas`.
- CI: GitHub Actions rodando `mvn test`, `mvn package`, smoke do instalador.
- JDK 21 (Liberica Full com JavaFX) portátil em `tools/jdk/`.
- Maven 3.9+ portátil em `tools/maven/`.
- WiX 3.11 portátil em `tools/wix/`.
- `server/` com Javalin + Xerial + Flyway + schema inicial + 1 rota (`/api/ping`) + healthcheck.
- `desktop/` com JavaFX + 1 tela "Olá, mundo" + permissões básicas.
- `web/` com página inicial apontando para `/api/ping`.
- `tools/build-server.mjs`, `tools/build-desktop.mjs`, `tools/build-web.mjs` (chamam `mvn`).
- `tools/run-tests.mjs` (chama `mvn test`).
- Testes: 5 unit (server) + 1 smoke (desktop).

**Aceite:** todos os builds rodam em sequência, CI verde, instalador EXE gerado e testado.

### Fase 3 — Domínio de tarefas e projetos
**Entregáveis:**
- Schema completo (entidades do §7.1) via Flyway.
- `core/` server: `TarefaCore.java`, `ProjetoCore.java`, `ClienteCore.java`, `AreaCore.java`, etc.
- `core/` desktop espelhado (subset necessário para offline).
- Rotas REST versionadas com OpenAPI.
- Telas FXML: Hoje, Próximas ações, Tarefas (lista+filtros), Tarefa (detalhe), Projeto, Cliente, Área, Captura rápida.
- Migração 0 → 1.
- Testes: 60+ asserções (regras de negócio).

**Aceite:** CRUD completo de tarefa + projeto + cliente, com isolamento por usuário, em ambos os frontends.

### Fase 4 — Motor de cobrança
**Entregáveis:**
- `core/LembreteCore.java` + `core/CobrancaCore.java` (motor determinístico, configurável).
- Worker de recorrências no servidor (`ScheduledExecutorService`).
- `notifications/Notificador.java` com JNA + fallback AWT.
- Script PowerShell pós-instal para registrar AUMID + Autostart configurável.
- Telas: Lembretes, Cobrança, Revisões (abertura/encerramento/semanal).
- Tabela `auditoria` completa.
- Testes: 30+ asserções (motor de cobrança, recorrência, fuso, horário de verão).

**Aceite:** tarefa crítica cobrada a cada 10min até decisão explícita, com janela fechada.

### Fase 5 — Sincronização e resiliência
**Entregáveis:**
- Fila local persistente (Xerial SQLite).
- Endpoints `/api/sync/empurrar`, `/api/sync/puxar`, `/api/sync/cursor`.
- Resolução de conflitos com UI lado-a-lado JavaFX.
- SSE `/sse/eventos` via Javalin.
- Backup automatizado com SHA-256 e teste de restauração documentado.
- Tela "Dispositivos" (revogar).
- Testes: 25+ asserções (sync, conflito, idempotência, restauração).

**Aceite:** dois dispositivos reais alteram dados offline, conflitam, reconciliam sem perda silenciosa.

### Fase 6 — Inteligência artificial
**Entregáveis:**
- `ai/` no servidor (rota `/api/ia/interpretar`, etc.) com `openai-java`.
- Prompts versionados em `server/src/main/resources/prompts/vN/`.
- Schemas Jackson para validar resposta da OpenAI.
- Telemetria: tokens consumidos, latência, falhas, custo estimado.
- Tela "Captura NL" e "Decompor com IA".
- Configurações → IA: ligar/desligar, escolher modelo, ver custo.
- Testes: regressão de prompts (golden tests).

**Aceite:** com chave da OpenAI desligada, todo o resto funciona. Ligada, captura NL produz estrutura validada.

### Fase 7 — Acabamento e entrega
**Entregáveis:**
- Revisão visual completa (clear, premium, dark+light) em JavaFX CSS.
- Acessibilidade (foco visível, contraste, navegação por teclado).
- Desempenho: medir e registrar números.
- `docs/MANUAL-DO-USUARIO.md` + `docs/GUIA-RAPIDO.md` + PDFs.
- `docs/MANUAL-INSTALACAO.md` + `docs/MANUAL-BACKUP-RECUPERACAO.md`.
- `tools/pack-release.mjs` (bump + mvn + jpackage + hashes + notas + release).
- Instalador final testado em Windows 11 limpo.
- Atualizador testado em duas versões consecutivas.
- Relatório final de validação com todos os hashes.

**Aceite:** §24 do PROJETO integralmente atendido. Relatório final de validação entregue.

---

## 14. Critérios objetivos de aceite por marco

| Marco | Critérios verificáveis |
|---|---|
| F0 ✅ | AGENTS.md, este doc, 6 ADRs, matriz presentes na raiz. |
| F1 | 7 documentos publicados. `gen-graphify.mjs` rodando. |
| F2 | `node tools/run-tests.mjs` → verde. CI verde. `mvn exec:java` no desktop mostra a tela inicial. `curl /api/ping` responde 200. `jpackage` gera EXE válido. |
| F3 | `node tools/run-tests.mjs` ≥ 60 verdes. Criar tarefa offline, concluir, reabrir, em desktop e web. |
| F4 | Tarefa crítica fechada → notificação a cada 10min até decisão explícita (verificado com script). Recorrência gera 12 ocorrências para "todo dia às 9h por 12 dias". |
| F5 | Dois dispositivos, ambos offline, alteram mesma tarefa → reconciliação sem perda silenciosa; conflito em campo crítico abre UI. Backup restaurado e validado. |
| F6 | Sem chave OpenAI: app funciona 100%. Com chave: `ia:interpretar` retorna JSON válido pelo schema. Custo registrado. |
| F7 | Instalador testado em Windows 11 limpo. App roda. Atualização testada. Documentação completa. Hashes calculados. Relatório final. |

---

## 15. Riscos conhecidos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| JNA + WinRT travar em alguma build do Windows | média | alto | Fallback AWT sempre presente; logs de fallback; testes E2E em Windows 10 e 11 |
| `jpackage` quebrar com nova versão do JDK | baixa | médio | Pin JDK 21 LTS; CI gera instalador antes de cada release |
| OpenAI mudar schema ou deprecar modelo | média | médio | Versão de prompt versionada; fallback para JSON mode sem `strict` |
| WiX 3.11 portátil não estar disponível | baixa | médio | Mirror interno em `tools/wix/`; script de download idempotente |
| Gravação SQLite corromper em queda de energia | baixa | crítico | WAL + sequência tmp → .old → move + restore automático no boot |
| Drift de relógio entre dispositivos | alta | médio | LWW com version vector **lógico** + tiebreaker por ULID (não usar wallclock) |
| JVM em segundo plano consumindo muita RAM | média | baixo | `Platform.setImplicitExit(false)` + ScheduledExecutorService; documentar como requisito ~150 MB |
| Backup da VPS não testar restauração | média | crítico | Script de restore automático em `tools/test-restore.mjs`; CI roda semanalmente |
| Instalador de 35-55 MB assustar usuário | baixa | baixo | Comunicar tamanho real; comparativo Electron: 150MB+ |
| Falta de assinatura Authenticode → SmartScreen alerta | alta | médio | Documentar no manual; planejar certificado EV Code Signing quando viável |
| `Xerial SQLite JDBC` extrair nativo em tempdir bloqueado | baixa | alto | Documentar como requisito; testar em ambiente restrito |
| WiX 3.11 exigir .NET Framework 3.5.1 no build | média | baixo | Build em container limpo; .NET 3.5.1 já vem habilitado no Windows 11 |

---

## Anexo A — pesquisa de estado da arte (resumo)

| Tema | Conclusão | Fonte principal |
|---|---|---|
| Linguagem desktop | Java 21 LTS com JavaFX 21; Liberica JDK Full inclui FX | https://bell-sw.com/blog/creating-modern-desktop-apps-with-javafx-and-spring-boot/ |
| Empacotamento desktop | jpackage (Java 14+) gera EXE/MSI com JRE embutido; precisa WiX 3.11 no Windows | https://docs.oracle.com/en/java/javase/21/docs/specs/man/jpackage.html |
| Framework web | Javalin 6.x estável, 7.x mais novo; Jetty + SSE + OpenAPI plugin | https://javalin.io/ |
| Driver SQLite | Xerial SQLite JDBC 3.50+; Type 4 com nativos embutidos | https://github.com/xerial/sqlite-jdbc |
| Notificações Windows | `AppNotificationManager` (WinRT) substitui UWP; funciona unpackaged com AUMID | https://learn.microsoft.com/en-us/windows/apps/develop/notifications/ |
| IA estruturada | Structured Outputs (`responseFormat`) estável desde 06/2024; melhor que JSON mode | https://openai.com/index/introducing-structured-outputs-in-the-api/ |
| Sync offline | LWW com version vector; CRDT só para colaboração simultânea no mesmo campo | https://debugg.ai/resources/local-first-apps-2025-crdts-replication-edge-storage-offline-sync |
| Push web | SSE é o padrão de fato (auto-reconnect, HTTP/2, CDN) | https://websocket.org/comparisons/sse/ |
| Pool JDBC | HikariCP 5.x é padrão | https://github.com/brettwooldridge/HikariCP |
| Migrações | Flyway 10 community suporta SQLite | https://flywaydb.org/ |

---

## Anexo B — glossário de identidade imutável

```
applicationId ............ app.mllopes.gestor
binaryName ............... GestorInteligenteDeDemandas
pasta de dados ........... %APPDATA%/GestorInteligenteDeDemandas/
banco local .............. gestor_local.db (Xerial SQLite JDBC)
banco central ............ gestor_central.db (Xerial SQLite JDBC + WAL + HikariCP)
slug do repo ............. gestor-inteligente-de-demandas
owner do repo ............ ml-lopes
editor ................... ML Lopes Design
idioma ................... pt-BR (UI); en-US (logs)
fuso padrão .............. America/Sao_Paulo (configurável por usuário)
JDK ...................... 21 LTS
runtime alvo ............. JRE mínimo via jlink (35-55 MB)
stack .................... Java 21 + JavaFX 21 + Javalin 6/7 + Xerial SQLite JDBC 3.50+ + Flyway 10 + JNA 5 + openai-java 4
versão inicial ........... 0.1.0
primeira release pública . 0.7.0 (após F2 + F3)
```

> Conferir antes de cada release. Mudou qualquer um → quebra atualização e migração.

---

*ML Lopes Design · Marcio · mlopesdesign@gmail.com*
*Fase 0 concluída em 14/08/2026. Revisão 1 (mesmo dia): stack migrada para Java 21 LTS por decisão do proprietário.*
