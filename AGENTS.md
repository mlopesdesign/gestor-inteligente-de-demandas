# AGENTS — Gestor Inteligente de Demandas · ML Lopes Design

> Arquivo de governança para qualquer agente de IA que tocar neste projeto.
> Lido integralmente **antes** de qualquer alteração. Vinculante.

---

## 1. Identidade imutável do produto

Estes valores **nunca** mudam após o primeiro release.

| Atributo | Valor | Observação |
|---|---|---|
| **applicationId** | `app.mllopes.gestor` | Pasta de dados, AppUserModelID, atalhos |
| **binaryName** | `GestorInteligenteDeDemandas` | Nome do .exe, sem espaços, sem acento |
| **Pasta de dados** | `%APPDATA%/GestorInteligenteDeDemandas` | Banco, fila, anexos, log |
| **Banco central (servidor)** | `gestor_central.db` (SQLite + WAL via Xerial JDBC) | Servidor Java |
| **Banco local (desktop)** | `gestor_local.db` (SQLite via Xerial JDBC) | Cache + fila offline |
| **applicationId do instalador** | mesmo do app | Pacote, registro Windows |
| **Slug do repositório** | `gestor-inteligente-de-demandas` | GitHub |
| **Owner do repositório** | `ml-lopes` | GitHub |
| **Identidade visual** | ML Lopes Design — premium, dark/light, paleta neutra com 1 cor de marca | Documento separado |

> Mudou qualquer um destes → quebra atualização, banco e atalhos. Conferir antes de cada release.

---

## 2. Documentos normativos (ordem de precedência)

Quando houver divergência, vale o documento de **maior precedência**.

| # | Documento | Precedência | Lido em |
|---|---|---|---|
| 1 | `docs/00-DIAGNOSTICO-ARQUITETURA-PLANO.md` | vinculante (Fase 0) | 2026-08-14 |
| 2 | `docs/MATRIZ-RASTREABILIDADE.md` | vinculante (requisitos) | 2026-08-14 |
| 3 | `docs/adr/*.md` | vinculante (decisões) | contínua |
| 4 | `PROJETO-GESTOR-INTELIGENTE-DE-DEMANDAS.md` | ESPECIFICAÇÃO MESTRA | 2026-08-14 |
| 5 | `PADRAO-ML-LOPES-DESIGN.md` | FILOSOFIA + REGRAS DE OURO (exceção registrada em ADR 0001) | 2026-08-14 |

**Hierarquia:** um documento de menor número **NUNCA** contradiz um de maior. Em conflito, prevalece o de menor número. Conflitos residuais são registrados em ADR.

---

## 3. Stack aprovada

> **Linguagem: Java 21 LTS. NÃO é JavaScript. NÃO é TypeScript.**
> Decisão do proprietário em 14/08/2026 ("Java mesmo, refaz do zero"). Exceção registrada em ADR 0001 revisão 1.
> Quebra o padrão ML Lopes Design §2.1 (que recomenda JavaScript). Demais pontos do padrão (§3.4 permissão no backend, §4.2 alta frequência, §4.3 gravação atômica, §5 atualização) permanecem vinculantes.

| Camada | Tecnologia | Versão | Justificativa |
|---|---|---|---|
| **Linguagem** | Java | 21 LTS | Decisão do proprietário |
| **Build** | Maven | 3.9+ | Padrão em Windows; Pin em CI |
| **UI desktop** | JavaFX | 21 (OpenJFX ou Liberica JDK Full) | Toolkit oficial; FXML + CSS; WebView baseado em WebKit |
| **Renderização local** | `javafx.scene.web.WebView` | do JavaFX | Sem dependência de WebView2/Edge |
| **Banco local** | Xerial SQLite JDBC | 3.50+ | Type 4 driver com nativos embutidos |
| **Banco central** | Xerial SQLite JDBC + HikariCP | 3.50+ / 5.x | Mesmo engine do cliente; pool para concorrência |
| **Migrações** | Flyway Community | 10.x | Versionado, suporta SQLite |
| **Servidor** | Javalin | 6.x ou 7.x | Microframework leve sobre Jetty |
| **Web** | HTML+CSS+JS puros | — | Servido pelo Javalin |
| **Autenticação** | argon2-jvm | 2.x | argon2id |
| **JSON** | Jackson | 2.x | Padrão de mercado |
| **Validação** | Hibernate Validator (Jakarta) | 8.x | Bean Validation 3.0 |
| **Logging** | SLF4J + Logback + logstash-encoder | atual | Estruturado, correlation id |
| **Datas** | `java.time` | nativo | API moderna; fuso por `ZoneId` |
| **Push em tempo real** | Server-Sent Events (SSE) via Javalin | nativo | Mais simples que WebSocket |
| **IA** | `com.openai:openai-java` | 4.x | Structured Outputs (`responseFormat`) |
| **Notificações desktop** | JNA + WinRT `AppNotificationManager` | 5.x | API moderna; fallback AWT |
| **Empacotamento** | jpackage + WiX | Java 21 / WiX 3.11 | EXE/MSI com JRE embutido |
| **Atualização** | GitHub Releases + `curl.exe` (via `ProcessBuilder`) | — | Mesma forma do padrão §5 |
| **Versionamento** | semver em 6 lugares sincronizados | — | bump automatizado |

### 3.1 Versões pinned (NÃO upgrade sem ADR)

- Java: **21 LTS**
- Maven: **3.9+**
- JavaFX: **21**
- Xerial SQLite JDBC: **3.50.3+**
- Javalin: **6.x ou 7.x** (definir e fixar)
- Flyway: **10.x**
- HikariCP: **5.x**
- Jackson: **2.x**
- Hibernate Validator: **8.x**
- argon2-jvm: **2.x**
- JNA: **5.x**
- openai-java: **4.x**
- WiX: **3.11** (portável em `tools/wix/`)

### 3.2 JRE no cliente

**JRE embutido no instalador** via `jlink` (runtime mínimo) + `jpackage` (instalador). Tamanho esperado: 35-55 MB. Trade-off aceito pela decisão do proprietário.

---

## 4. Princípios inegociáveis (do padrão ML Lopes + projeto)

1. **Regra de negócio em `core/`, função pura, primeiro parâmetro `db`.** Java: `core/TarefaCore.java` com métodos estáticos que recebem `DataSource` (ou `Connection`) como primeiro parâmetro.
2. **Permissão no backend, nunca só na tela.**
3. **IA nunca é dependência das funções essenciais.** Caiu a API, o app continua.
4. **Offline é o normal.** A fila local existe por padrão; sync é otimização.
5. **Cobrança é contínua** até decisão explícita (concluir, adiar c/ motivo, bloquear, cancelar c/ motivo).
6. **Sem perda silenciosa de dados.** Conflito visível; sobrescrita nunca silenciosa.
7. **Nenhum segredo no cliente.** Chave de IA no servidor, jamais no JAR distribuído. Verificado por `grep` no build.
8. **LGPD observado.** Exportar e apagar dados próprios é função de primeira classe.
9. **Testar o caminho mínimo**, não só o completo.
10. **Testar a migração sobre banco no formato antigo.**
11. **Versão bump em todo build.** Inclusive rebuild do mesmo dia. Bump em 6 lugares sincronizados.
12. **Documentação na mesma entrega.**
13. **Diagnóstico cita arquivo:linha. Nunca suposição.**

---

## 5. Estrutura de pastas (versão alvo)

```
E:\Projetos\LOPES FOCUS\
├── AGENTS.md                       ← este arquivo
├── PADRAO-ML-LOPES-DESIGN.md       ← não mexer
├── PROJETO-GESTOR-INTELIGENTE-DE-DEMANDAS.md  ← não mexer
├── docs/
│   ├── 00-DIAGNOSTICO-ARQUITETURA-PLANO.md
│   ├── MATRIZ-RASTREABILIDADE.md
│   ├── MANUAL-DO-USUARIO.md
│   ├── GUIA-RAPIDO.md
│   ├── MANUAL-INSTALACAO.md
│   ├── MANUAL-BACKUP-RECUPERACAO.md
│   ├── adr/
│   │   ├── 0001-stack-final.md
│   │   ├── 0002-sincronizacao-lww-versionado.md
│   │   ├── 0003-banco-sqlite-ponto-unico.md
│   │   ├── 0004-ia-gateway-versionado.md
│   │   ├── 0005-notificacoes-appnotification.md
│   │   ├── 0006-atualizacao-online.md
│   │   └── 0007-assinatura-atualizacao.md
│   ├── 01-MODELO-DOMINIO.md            (Fase 1)
│   ├── 02-MODELO-DADOS.md              (Fase 1)
│   ├── 03-CONTRATOS-API.md             (Fase 1)
│   ├── 04-POLITICA-SYNC.md             (Fase 1)
│   ├── 05-THREAT-MODEL.md              (Fase 1)
│   ├── 06-ESTRATEGIA-NOTIFICACOES.md   (Fase 1)
│   └── 07-ESTRATEGIA-INSTALACAO.md     (Fase 1)
│   └── manuais/
│       └── screenshots/
├── desktop/                        ← app JavaFX (Maven module)
│   ├── pom.xml
│   ├── src/main/java/app/mllopes/gestor/
│   │   ├── App.java
│   │   ├── core/                   ← regra pura
│   │   ├── db/                     ← wrapper Xerial SQLite JDBC
│   │   ├── sync/                   ← fila + version vector
│   │   ├── notifications/          ← JNA + AWT fallback
│   │   ├── ui/                     ← controllers JavaFX
│   │   ├── tray/                   ← SystemTray
│   │   └── update/                 ← atualizador (curl + SHA-256)
│   ├── src/main/resources/
│   │   ├── fxml/                   ← telas
│   │   ├── css/                    ← tema dark+light
│   │   ├── icons/                  ← .ico + .png
│   │   └── app.properties          ← versão
│   └── src/test/java/...
├── server/                         ← API central Java (Maven module)
│   ├── pom.xml
│   ├── src/main/java/app/mllopes/gestor/api/
│   │   ├── Server.java             ← Javalin
│   │   ├── core/                   ← regra de negócio (espelha o desktop)
│   │   ├── db/                     ← Flyway + HikariCP + Xerial
│   │   ├── auth/                   ← argon2 + sessões
│   │   ├── sync/                   ← /api/sync/* + /sse/eventos
│   │   ├── ai/                     ← gateway OpenAI
│   │   ├── notifications/          ← adaptadores SMTP/Telegram
│   │   ├── routes/                 ← handlers por área
│   │   └── observability/          ← logs + auditoria
│   ├── src/main/resources/
│   │   ├── db/migration/           ← Flyway V<n>__<desc>.sql
│   │   ├── prompts/v1/             ← prompts versionados
│   │   └── logback.xml
│   └── src/test/java/...
├── web/                            ← app web (estático, sem build)
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
├── installer/
│   ├── wix/                        ← WiX 3.11 portátil
│   ├── scripts/
│   │   ├── install-aumid.ps1
│   │   └── uninstall-aumid.ps1
│   └── resources/                  ← ícone, license, banner
├── tools/
│   ├── bump-version.mjs
│   ├── build-desktop.mjs           ← mvn package + jpackage
│   ├── build-server.mjs            ← mvn package
│   ├── build-web.mjs               ← copy
│   ├── build-installer.mjs         ← jpackage (chama mvn antes)
│   ├── run-tests.mjs
│   ├── smoke-installer.ps1
│   ├── gen-graphify.mjs
│   ├── check-no-openai-on-client.mjs
│   ├── check-release.mjs
│   ├── pack-release.mjs
│   └── wix/                        ← WiX portátil
├── tests/
│   ├── shared/                     ← regras de negócio espelhadas
│   ├── desktop/
│   ├── server/
│   └── e2e/
└── release/                         ← artefatos finais (gitignored)
```

> Nada disso existe ainda. Será criado passo a passo, com build/testes a cada marco.

---

## 6. Comandos de uso (referência rápida)

```powershell
# Desenvolvimento desktop (com classe Maven)
cd desktop; mvn compile exec:java

# Build desktop (gera JAR + jpackage)
node tools/build-desktop.mjs

# Subir servidor (dev)
cd server; mvn spring-boot:run  # ou mvn exec:java, conforme config

# Rodar todos os testes
node tools/run-tests.mjs

# Empacotar release
node tools/pack-release.mjs
```

---

## 7. Histórico de decisões

Ver `docs/adr/`. Cada decisão permanente (escolha de stack, algoritmo de sync, biblioteca, breaking change) ganha um ADR.

ADRs já registrados:
- `0001-stack-final.md` — Stack final (Java 21 LTS + JavaFX 21 + Javalin + Xerial SQLite JDBC + jpackage + WiX 3.11 + openai-java + JNA + AppNotificationManager). **Revisão 1**: decisão do proprietário por Java.
- `0002-sincronizacao-lww-versionado.md` — Sincronização LWW + version vector + ULID tiebreaker. Implementação Java.
- `0003-banco-sqlite-ponto-unico.md` — Banco SQLite (Xerial JDBC 3.50+ + WAL + HikariCP no servidor / Xerial JDBC local no desktop). Flyway 10.
- `0004-ia-gateway-versionado.md` — Gateway de IA isolado no servidor com `openai-java`, prompts versionados, structured outputs.
- `0005-notificacoes-appnotification.md` — Notificações via JNA + `AppNotificationManager` (WinRT) com fallback AWT.
- `0006-atualizacao-online.md` — Mesma forma de atualizar online do padrão ML Lopes §5 (GitHub Releases + curl.exe + SHA-256 + version > + backup antes). Implementação Java via `ProcessBuilder`.
- `0007-assinatura-atualizacao.md` — Política de assinatura digital em 4 camadas (HTTPS, SHA-256, Authenticode, semver); autoassinado no MVP, OV no médio prazo, EV no longo prazo.

---

## 8. Histórico de versões (do projeto)

Será mantido em `docs/HISTORICO-VERSOES.md` no formato do padrão ML Lopes — causa raiz + correção + lição, não changelog de marketing.

---

*ML Lopes Design · Marcio · mlopesdesign@gmail.com*
*Gerado em 14/08/2026 como FASE 0 do projeto Gestor Inteligente de Demandas.*
*Revisão 1 (mesmo dia): stack migrada para Java por decisão do proprietário.*
