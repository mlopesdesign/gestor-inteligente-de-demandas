# AGENTS — Gestor Inteligente de Demandas

> Arquivo de governança para qualquer agente de IA que tocar neste projeto.
> Lido integralmente **antes** de qualquer alteração. Vinculante.

---

## 1. Identidade imutável do produto

Estes valores **nunca** mudam após o primeiro release.

| Atributo | Valor | Observação |
|---|---|---|
| `applicationId` | `app.mllopes.gestor` | Pasta de dados, AppUserModelID, atalhos |
| `binaryName` | `GestorInteligenteDeDemandas` | Nome do `.exe` (Neutralino launcher), sem espaços, sem acento |
| Pasta de dados | `%APPDATA%\GestorInteligenteDeDemandas\dados\` | Banco, fila, anexos, log |
| Banco local (cliente) | `gestor.db` (SQLite via sql.js) | Single-user, um dono do dado |
| `applicationId` do instalador | mesmo do app | Pacote, registro Windows |
| Slug do repositório | `gestor-inteligente-de-demandas` | GitHub |
| Owner do repositório | `ml-lopes` | GitHub |

> Mudou qualquer um destes → quebra atualização, banco, atalhos e link da AppUserModelID. Conferir antes de cada release.

---

## 2. Documentos normativos (ordem de precedência)

Quando houver divergência, vale o documento de **maior precedência**.

| # | Documento | Precedência | Lido em |
|---|---|---|---|
| 1 | `PADRAO-ML-LOPES-DESIGN.md` | vinculante (fonte da verdade sobre stack e processo) | 2026-08-14 |
| 2 | `PROJETO-GESTOR-INTELIGENTE-DE-DEMANDAS.md` | vinculante (especificação do produto) | 2026-08-14 |
| 3 | `docs/MATRIZ-RASTREABILIDADE.md` | vinculante (requisitos → implementação → teste) | 2026-08-14 |
| 4 | `docs/adr/*.md` | vinculante (decisões técnicas) | contínua |
| 5 | `docs/01-07-*.md` | especificação (domínio, dados, contratos, sync, threat, notificações, instalação) | 2026-08-14 |
| 6 | `docs/MANUAL-*.md` + `docs/GUIA-RAPIDO.md` | manual do usuário | 2026-08-14 |

**Hierarquia:** um documento de menor número **NUNCA** contradiz um de maior. Em conflito, prevalece o de menor número. Conflitos residuais são registrados em ADR.

---

## 3. Stack aprovada (do PADRÃO §2.2)

| Camada | Tecnologia | Versão | Justificativa |
|---|---|---|---|
| Linguagem | JavaScript (ES2020+) | — | Padrão §2.1. Módulos nativos, sem compilação |
| UI | HTML + CSS escritos à mão | — | Padrão §2.5. Sem Tailwind, sem framework |
| Framework desktop | **Neutralino.js** | 6.3.0 | Padrão §2.2. Empacota como `.exe` do Windows |
| Renderização | **WebView2** | do Windows 10/11 | Já vem no Windows. Zero runtime embutido |
| Banco local | **sql.js** (SQLite → JS) | atual | Carrega `.db` na memória, regrava a cada escrita |
| Extensão nativa | PowerShell | do Windows | Rede local, impressão, instalação |
| Empacotamento | **NSIS** | 3.x | Gera o `Setup.exe` (~15 MB) |
| Build/dev | Node.js | 22+ | **SÓ** no ambiente de desenvolvimento |

### 3.1 Versões pinned

- Neutralino: **6.3.0** (não upgrade sem ADR)
- WebView2: a do Windows do usuário (runtime do sistema, sem versão fixa)
- sql.js: última estável do `vendor/`
- NSIS: **3.10+**

### 3.2 PROIBIDO (do PADRÃO §2.5)

- TypeScript
- React, Vue, Angular, Svelte
- Electron
- Webpack, Vite, Rollup, Babel
- Tailwind ou qualquer CSS com compilador
- Dependências npm no código do cliente
- **Java, Javalin, JavaFX, jpackage, Maven** ← erro da sprint 14/08/2026
- Node.js no cliente (só no dev)

---

## 4. Princípios inegociáveis (do PADRÃO §1, §3, §6, §7, §8)

1. **Software leve, sem runtime.** Zero dependência instalada na máquina do cliente.
2. **Regra de negócio em `src/js/backend/core/`, função pura, primeiro parâmetro `db`.** Sem DOM, sem `window`, sem Neutralino dentro do core.
3. **Uma porta única `api(canal, payload)`** entre tela e regra. A tela não sabe se está rodando no app ou num terminal em rede.
4. **Permissão no backend, nunca só na tela.** `servidor.js:processar` consulta `PERM_ROTA` antes de chamar a regra.
5. **Offline é o normal.** Sql.js carrega o `.db` na memória, tudo funciona sem rede. Sync é otimização, não dependência.
6. **Cobrança contínua até decisão explícita** (do PROJETO §9).
7. **Sem perda silenciosa de dados.** Conflito visível, sobrescrita nunca silenciosa.
8. **Nenhum segredo no cliente.** Chave de IA no servidor (se houver), jamais no bundle.
9. **LGPD observado.** Exportar e apagar dados próprios são funções de primeira classe.
10. **Testar o caminho mínimo, não só o completo.**
11. **Testar a migração sobre banco no formato antigo.**
12. **Bump de versão em todo build**, inclusive rebuild do mesmo dia. Bump em todos os lugares sincronizados.
13. **Documentação na mesma entrega.**
14. **Diagnóstico cita arquivo:linha. Nunca suposição.**

---

## 5. Estrutura de pastas (versão alvo)

```
E:\Projetos\LOPES FOCUS\
├── AGENTS.md                                  ← este arquivo
├── README.md
├── PADRAO-ML-LOPES-DESIGN.md                  ← normativo (cópia local)
├── PROJETO-GESTOR-INTELIGENTE-DE-DEMANDAS.md  ← normativo (cópia local)
├── neutralino.config.json                     ← config do app (id, version, icon)
├── package.json                               ← SÓ dev (build, testes, GRAPHIFY)
├── schema.sql                                 ← fonte de verdade do banco (do PADRÃO §11)
│
├── src/                                       ← código-fonte entregue
│   ├── index.html
│   ├── css/app.css
│   ├── js/
│   │   ├── app.js                             ← menu, permissões, api() gateway
│   │   ├── telas/                             ← uma por área do menu
│   │   │   ├── hoje.js
│   │   │   ├── tarefas.js
│   │   │   ├── projetos.js
│   │   │   ├── clientes.js
│   │   │   ├── areas.js
│   │   │   ├── sincronizacao.js
│   │   │   ├── configuracoes.js
│   │   │   └── ...
│   │   ├── vendor/                            ← libs de terceiros (sem npm no cliente)
│   │   │   ├── sql-wasm.js
│   │   │   ├── neutralino.js
│   │   │   └── neutralino.css
│   │   └── backend/
│   │       ├── servidor.js                    ← despacha canal → core/*, aplica PERM_ROTA
│   │       ├── db.js                          ← wrapper sql.js + migrações
│   │       ├── ambiente.js                    ← tudo que toca o sistema operacional
│   │       ├── permissoes.js
│   │       ├── update.js                      ← auto-update (substitui resources.neu)
│   │       └── core/                          ← regras de negócio PURAS
│   │           ├── usuarios.js
│   │           ├── auth.js
│   │           ├── tarefas.js
│   │           ├── cobrancas.js
│   │           ├── recorrencias.js
│   │           ├── sync.js
│   │           ├── ia.js
│   │           └── ...
│   └── resources/
│       ├── icons/
│       └── images/
│
├── tests/                                     ← Node contra SQLite real (do PADRÃO §7.4)
│   ├── test-tarefas.mjs
│   ├── test-cobrancas.mjs
│   ├── test-recorrencias.mjs
│   └── ...
│
├── docs/
│   ├── 00-PADRAO-ML-LOPES-DESIGN.md          ← cópia local
│   ├── 01-MODELO-DOMINIO.md
│   ├── 02-MODELO-DADOS.md
│   ├── 03-CONTRATOS-API.md
│   ├── 04-POLITICA-SYNC.md
│   ├── 05-THREAT-MODEL.md
│   ├── 06-ESTRATEGIA-NOTIFICACOES.md
│   ├── 07-ESTRATEGIA-INSTALACAO.md
│   ├── GUIA-RAPIDO.md
│   ├── MANUAL-DO-USUARIO.md
│   ├── MANUAL-INSTALACAO.md
│   ├── MANUAL-BACKUP-RECUPERACAO.md
│   ├── MATRIZ-RASTREABILIDADE.md
│   └── adr/
│
├── installer/
│   ├── gestor.nsi                              ← NSIS (gera Setup.exe)
│   ├── LICENSE.txt
│   └── resources/
│       ├── icon.ico
│       └── icon.png
│
├── wp-api/                                     ← NOVO 2026-08-17: plugin WP da API REST
│   ├── AGENTS.md                                ← governança do plugin WP
│   ├── README.md
│   └── gestor-api/                              ← slug do plugin = nome da pasta
│       ├── gestor-api.php                       ← bootstrap + activation hook
│       ├── uninstall.php
│       ├── includes/
│       │   ├── rest/                            ← controllers REST
│       │   ├── auth/                            ← email+senha → token
│       │   ├── db/                              ← schema + migrations
│       │   └── sync/                            ← pull/push incremental
│       ├── tests/                               ← PHPUnit contra WP test framework
│       ├── docs/
│       └── languages/
│
├── android-app/                                ← NOVO 2026-08-17: app Android (Kotlin+Compose)
│   ├── AGENTS.md                                ← governança do app
│   ├── README.md
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   ├── gradle.properties
│   ├── gradle/wrapper/                          ← gradle-wrapper.jar + properties
│   ├── docs/                                    ← MANUAL-ANDROID + GUIA-API
│   └── app/
│       ├── build.gradle.kts
│       ├── proguard-rules.pro
│       └── src/
│           ├── main/
│           │   ├── AndroidManifest.xml
│           │   ├── java/com/mlopes/gestor/
│           │   │   ├── data/                    ← Retrofit + Room + Repositories
│           │   │   ├── domain/                  ← Models + UseCases
│           │   │   ├── ui/                      ← Compose screens (auth, tarefas, projetos, clientes, áreas)
│           │   │   └── di/                      ← Hilt modules
│           │   └── res/                         ← Material 3 theme + icons
│           └── test/                            ← JUnit + MockK
│
├── tools/
│   ├── setup-env.ps1                           ← carrega PATH do Node + Neutralino + NSIS
│   ├── build.mjs                               ← neu build + empacota
│   ├── bump-version.mjs                        ← bumpa em 3 lugares sincronizados
│   ├── run-tests.mjs                           ← roda `node tests/`
│   ├── graphify.mjs                            ← gera GRAPHIFY.md (mapa técnico)
│   ├── download-neutralino.mjs                 ← baixa Neutralino SDK portátil
│   ├── download-nsis.mjs                       ← baixa NSIS portátil
│   ├── publish-release.ps1                     ← publica via gh CLI
│   └── smoke-telas-runtime.mjs                 ← smoke runtime de cada tela
│
├── .trash-java/                                ← (temporário) lixeira do que era Java
│
└── .github/
    └── workflows/
        └── ci.yml
```

---

## 6. Comandos de uso (referência rápida)

```powershell
# Setup ambiente (carrega Node + Neutralino + NSIS no PATH)
. .\tools\setup-env.ps1

# Rodar testes Node contra SQLite real
node tools/run-tests.mjs

# Build Neutralino (gera resources.neu + binário)
node tools/build.mjs

# Bump de versão (3 lugares: neutralino.config.json + src/js/app.js + src/js/backend/ambiente.js)
node tools/bump-version.mjs 0.1.0

# Gerar GRAPHIFY.md (mapa técnico)
node tools/graphify.mjs

# Publicar release (Setup.exe + resources.neu no GitHub)
powershell -File tools\publish-release.ps1 v0.1.0 "Título" "Notas markdown"
```

---

## 7. Histórico de decisões

ADRs em `docs/adr/`. Cada decisão permanente (escolha de stack, algoritmo de sync, biblioteca, breaking change) ganha um ADR.

ADRs já registrados:
- (a registrar após o refazer do zero, conforme decisões forem tomadas)

---

## 8. Histórico de versões (do projeto)

Será mantido em `docs/HISTORICO-VERSOES.md` no formato do padrão — causa raiz + correção + lição, não changelog de marketing.

---

## 9. Projetos irmãos (wp-api + android-app) — iniciado em 2026-08-17

A partir de 17/08/2026, o Marcio quer **conversar com o Gestor (desktop)** a partir de um app Android. A integração passa por uma **API REST central hospedada como plugin WordPress** no subdomínio dele (`tools.mlopesdesign.com.br`).

### 9.1 REGRA DE FERRO — NÃO MEXER NO GESTOR v0.2.22

> **Marcio mandou "NÃO MEXA EM MAIS NADA AGORA" depois da v0.2.22 estar funcional.**
> Qualquer alteração no `src/`, `installer/`, `schema.sql`, `tools/`, ou `neutralino.config.json` do Gestor desktop **SÓ com ordem explícita dele por escrito neste chat**.
>
> Fases de sync (que mexem no Gestor) ficam **bloqueadas** até liberação.

### 9.2 Os 2 novos projetos

| Projeto | Diretório | Stack | Agente responsável | Status |
|---|---|---|---|---|
| **Plugin WP da API** | `wp-api/` | PHP 8.x + WordPress 6.x + WP REST API + MySQL | `wp-architect` | Aguardando briefing detalhado |
| **App Android** | `android-app/` | Kotlin + Jetpack Compose + Material 3 + Room (offline) + Retrofit + Hilt | `coder` | Aguardando briefing detalhado (DEPOIS da API estar pronta) |

### 9.3 Domínio e URL

- **Subdomínio da API**: `https://tools.mlopesdesign.com.br/wp-json/gestor/v1/...` (em construção, mas pode ser usado)
- **Banco**: MySQL do WP, tabelas custom `wp_gestor_*` (espelho do `schema.sql` do Gestor)
- **Auth**: email + senha (mesma base de `usuarios` do Gestor, validada no plugin) → token de sessão com validade 30 dias

### 9.4 Princípios dos 2 projetos novos (somam aos do PADRÃO)

1. **Custo zero absoluto.** Sem Play Store, sem certificado pago, sem hospedagem premium, sem Firebase, sem Supabase. Self-hosted no VPS do Marcio, banco MySQL já existente no WP.
2. **Compatibilidade com o `schema.sql` do Gestor.** Cada tabela do MySQL do WP é espelho 1:1 do `schema.sql` (campos, tipos, defaults). O `wp_architect` lê `schema.sql` antes de criar as migrations.
3. **CRUD bidirecional (Gestor ↔ WP ↔ Android).** Toda entidade tem `created_at`, `updated_at`, `deleted_at` (soft-delete) e ULID como ID (igual ao Gestor). Sync pull = `WHERE updated_at > since`. Sync push = batch de mutações locais.
4. **Offline-first no Android.** Room guarda snapshot local; se rede cair, mutations ficam numa fila `pending_ops` e sobem no próximo push.
5. **REST segue a convenção do `docs/03-CONTRATOS-API.md`.** Mesmo schema JSON que o Gestor já consome via `core/sync.js`.
6. **Plugin WP no padrão TUDO PREMIUM do `wp-architect`.** Slug = nome da pasta, `register_activation_hook` com try/catch, sanitização em todo input, escape em todo output, nonce em toda mutation.
7. **App Android no padrão TUDO PREMIUM do `coder`.** Kotlin idiomático, sem `!!`, sem `runBlocking` em produção, Hilt pra DI, Compose pra UI, testes JUnit + MockK antes de qualquer entrega.

### 9.5 Fases de execução (ordem)

| Fase | Entrega | Bloqueio |
|---|---|---|
| **F1** | Plugin WP completo: schema MySQL, REST endpoints, auth, sync, PHPUnit | — |
| **F2** | App Android: esqueleto Android Studio, telas Compose, Retrofit+Room, login, CRUD básico | Depende de F1 |
| **F3** | Sync bidirecional no Gestor desktop (v0.2.23+) | **BLOQUEADO** até Marcio liberar |
| **F4** | Validação end-to-end (cria tarefa no Android → aparece no WP admin) | Depende de F2 |
| **F5** | Docs: `MANUAL-ANDROID.md`/`.pdf` + `GUIA-API.md`/`.pdf` | Depende de F4 |

### 9.6 Comandos rápidos dos 2 projetos

```powershell
# Plugin WP
cd E:\Projetos\LOPES FOCUS\wp-api
# (zipar) zip -r gestor-api.zip gestor-api/ -x "*.git*"
# (instalar no WP) cp gestor-api.zip /var/www/tools.mlopesdesign.com.br/wp-content/plugins/ && unzip -o ...; ativa no admin WP

# App Android
cd E:\Projetos\LOPES FOCUS\android-app
# (build) gradle wrapper + ./gradlew assembleDebug
# (instalar no emulador/dispositivo) ./gradlew installDebug
```

---

*ML Lopes Design · Marcio · mlopesdesign@gmail.com · mlopesdesign.com.br · tools.mlopesdesign.com.br*
*Gerado em 14/08/2026 — refeito em 14/08/2026 22:25 BRT após reprovação da entrega em Java. Stack agora: JavaScript + Neutralino + sql.js + WebView2 + NSIS.*
**Atualizado em 17/08/2026 — adicionados projetos irmãos `wp-api/` (plugin WP) e `android-app/` (Kotlin+Compose). REGRA DE FERRO §9.1: NÃO MEXER NO GESTOR v0.2.22 até Marcio liberar.**
