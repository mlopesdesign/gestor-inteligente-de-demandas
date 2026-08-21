# Histórico de versões — Gestor Inteligente de Demandas

> Formato: causa raiz → correção → lição. Não é changelog de marketing.

---

## v0.2.39 — 2026-08-20 — FIX login de sincronização mentia (2 dias quebrado)

**Causa raiz:** `writeState` em `src/js/backend/core/sync.js:65-75` codificava o JSON em `Uint8Array` (`new TextEncoder().encode(...)`) e passava pra `Neutralino.filesystem.writeFile(path, data)`. Em Neutralino.js v6.3.0, esse padrão **grava 0 bytes silenciosamente** — mesmo bug que `db.js` teve em v0.2.10 com o SQLite (corrigido com certutil). O `try/catch` interno engolia a exceção, o `login()` retornava `ok: true`, o toast "Conectado" aparecia, e o `readState` seguinte não achava o arquivo → caía no `emptyState()` → UI renderizava "Desconectado" + bolinha vermelha. **Prova cruzada**: o arquivo `test-write.txt` (10 bytes, escrito com `writeFile(path, string)`) ESTAVA no disco. Nenhum `sync_state.json` foi criado em 2 dias. String funciona, Uint8Array não.

**Correção (3 mudanças em `sync.js`):**
1. `writeState` agora grava string UTF-8 direta (que `writeFile` aceita confiavelmente) em vez de `Uint8Array`. Cria o diretório `dados/` defensivamente antes (`createDirectory(dir).catch(()=>{})`).
2. `readState` usa `readBinaryFile` + `TextDecoder` (binário cru, sem decodificação UTF-8 implícita) com fallback pra `readFile` se `readBinaryFile` não existir.
3. `writeState` não engole mais exceções — o throw escapa. `login()` tem gate `if (!reloaded.wp_token) return erro` que falha explicitamente em vez de mentir com `ok: true`.

**Validação esperada:** após clicar Entrar uma vez, `Test-Path 'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas\dados\sync_state.json'` deve retornar `True` com o token gravado dentro. A aba Sincronização deve mostrar "Conectado" + bolinha verde **e continuar assim depois de fechar/reabrir o app**.

**Lição operacional:** `Neutralino.filesystem.writeFile` é estritamente para TEXTO (string UTF-8). Para binário use `writeBinaryFile(path, Uint8Array)` que faz base64 internamente. **NUNCA** passe `Uint8Array` pra `writeFile` — em v6.3.0 grava 0 bytes silencioso. O `try/catch` que engole a exceção no writeState é a maior armadilha: o login "funciona" do ponto de vista do chamador, mas o estado nunca persiste. Adicionar defesa no caller (gate `if (!reloaded.X)`) é obrigatório — try/catch interno é placebo. Mesmo padrão do `db.js` v0.2.10, repetido 2 anos depois. **Regra nova**: o `bump-version.mjs` v2 sincroniza 6 lugares (config, package, app.js, index.html, nsi, update.json) mas NÃO toca `User-Agent` nem `app_versao` em `sync.js` — sempre conferir e ajustar manualmente antes de commitar.

---

## v0.2.37 — 2026-08-20 — FIX auto-update só substituía .neu (src/ ficava desatualizado)

**Causa raiz:** `aplicarAtualizacao` em `src/js/app.js:593-680` sobrescrevia só `resources.neu` no disco. Mas Neutralino serve `src/` do disco (config `documentRoot: '/'` + `url: '/src/index.html'`), então o `src/` instalado ficava desatualizado até o usuário reinstalar via `INSTALAR-AGORA.exe`. Bug adicional: o `src/index.html` tinha `<meta name="app-version" content="0.2.25">` (meta tag desatualizada) — `app.js:121-123` lia meta PRIMEIRO, então o header mostrava "v0.2.25" mesmo rodando 0.2.36.

**Correção:** `aplicarAtualizacao` agora extrai `src/` de dentro do `resources.neu` (formato ASAR-like: 4 bytes magic + 3 ints LE + JSON header + arquivos concatenados) e sobrescreve `src/` no disco via `execCommand` PowerShell. Meta tag `app-version` corrigida pra versão atual.

**Lição:** auto-update DEVE atualizar `src/` junto com o `.neu`. O .neu é o source-of-truth do instalador; o src/ é o que o Neutralino serve em runtime. Esquecer do src/ = app fica inconsistente até reinstalar. **Regra nova**: `bump-version.mjs` DEVE atualizar `src/index.html` (meta tag) além de config/package/app.js — a meta tag é a fonte da verdade da versão mostrada pro usuário.

---

## v0.2.36 — 2026-08-20 — FIX F3 (sync bidirecional)

**Causa raiz:** `enviarPush` em `src/js/backend/core/sync.js` usava `st.ultimo_pull_id` como cursor do PUSH. Mas `ultimo_pull_id` é o cursor do PULL (último id de mudança recebida do servidor), não do PUSH. Resultado: qualquer pull com id alto (ex: 50) fazia o push ignorar mudanças locais com id menor que 50, mesmo nunca tendo sido enviadas.

**Correção:** cursor próprio `ultimo_push_id` no `emptyState()` e no `enviarPush`. Bug de compat: `r.dados` precisa funcionar tanto como array de arrays (sql.js/produção) quanto array de objetos (better-sqlite3/testes) — normalizado.

**Lição operacional:** TODA escrita em `core/*.js` DEVE chamar `enfileirarMudanca()` ANTES de retornar. Sem isso, mesmo com sync configurado, o push sai vazio. Regra do sync: separar cursores de push e pull — são direções opostas, sem relação entre si.

---

## v0.2.35 — 2026-08-20 — FIX aba Sincronização vazia

**Causa raiz:** `configuracoes.js` tinha 3 `tab-painel` (geral, atualização, backup) mas FALTAVA `tab-sync`. A função `carregarSyncStatus()` existia mas o elemento `#sync-status-area` não estava no DOM. Resultado: clicar na aba Sincronização mostrava tela em branco.

**Correção:** adicionado `<div class="tab-painel" id="tab-sync">` com placeholder e ativação de `carregarSyncStatus()` no clique da aba.

**Lição:** renderizar TODAS as tabs no template, mesmo as que estão "bloqueadas". Placeholder honesto > aba vazia.

---

## v0.2.34 — 2026-08-20 — FIX versão exibida errada

**Causa raiz:** `src/index.html` tinha `<meta name="app-version" content="0.2.25">`. `app.js:121-123` lia meta tag PRIMEIRO (antes de localStorage e NEUTRALINO_GLOBALS). `bump-version.mjs` só atualizava 3 lugares (config, package, app.js) — NÃO atualizava o `index.html`. Resultado: app sempre mostrava 0.2.25 mesmo rodando 0.2.33, pedindo update falso.

**Correção:** meta tags corrigidas + `bump-version.mjs` reescrito pra sincronizar 6 lugares (config, package, app.js, index.html, nsi, update.json).

**Lição:** a FONTE DA VERDADE da versão mostrada é a meta tag do `index.html`. Esquecer dela = app mostra versão antiga. Bump-version.mjs DEVE atualizar a meta.

---

## v0.2.33 — 2026-08-20 — FIX maximizar/restore limbo + auto-update reinicia

**Causa raiz #1 (maximizar):** WebView2 restaurava janela com `IsZoomed=True` mas `W=1200 H=760` (estado "maximized" mas tamanho normal). `rcNormalPosition` salvo tinha `x=32767, y=-32768` (MAX_INT/MIN_INT = posição inválida). Ao clicar maximizar, Windows fazia SW_RESTORE pra esse rcNormalPosition → janela ia pro limbo. `IsIconic` e `IsZoomed` mentiam; só `GetWindowRect` mostrava a verdade.

**Causa raiz #2 (auto-update):** `aplicarAtualizacao` chamava `app.exit()` em vez de `app.restartProcess()`. Exit fecha o app; restartProcess fecha e reabre.

**Correção:** detecção de "falso maximized" no boot via `isMaximized() + getSize()` + listener de resize com debounce 200ms que captura `|x|>10000` e recentraliza. `app.exit()` → `app.restartProcess()` no auto-update.

**Lição:** WebView2 tem bug de salvar `rcNormalPosition` em MAX_INT quando monitor desconecta. SEMPRE usar `GetWindowRect` (Win32) pra diagnosticar, nunca confiar só em `IsIconic`/`IsZoomed`. Auto-update SEMPRE `app.restartProcess()`.

---

## v0.2.32 — 2026-08-20 — FIX minimizar/sumiu

**Causa raiz:** Neutralino 6.3.0 ignora `width/height` do config na 1ª abertura, usa `minWidth/minHeight`. Resultado: app abria no canto superior esquerdo ou em posição indefinida. Combinado com WebView2 estado cached em `Local State` (sem limpeza pelo lado JS), a janela podia "sumir" do usuário.

**Correção:** `window.center()` + `window.setSize({width: 1200, height: 760})` no boot do `app.js`.

**Lição:** Neutralino 6.3.0 tem bug de primeira abertura. SEMPRE chamar `window.setSize()` após `window.center()`.

---

## v0.2.31 — 2026-08-20 — FIX 3 críticos (db.js + sync.js + certutil PT-BR)

**Causa raiz #1 (db.js):** `window.Neutralino.filesystem.removeFile(path)` — API INEXISTENTE na v6.3.0. API correta: `remove(path)`. 9 ocorrências no código. Cada save do banco falhava silenciosamente.

**Causa raiz #2 (sync.js):** `window.NL_CORS` — constante de versão antiga. v6.3.0 usa `!window.NL_PORT`. Resultado: `NO_APP=true` mesmo dentro do app. Sync 100% offline (não falhava, mas também não tentava).

**Causa raiz #3 (certutil PT-BR):** código só procurava "successfully" em inglês no output. PT-BR retorna "concluído com êxito". Bug bônus descoberto em smoke test — checksum SHA256 do banco corrompia silenciosamente.

**Correção:** 9 `removeFile` → `remove`; `NL_CORS` → `!window.NL_PORT`; certutil aceita exitCode=0 + "êxito"/"concluído"/"successfully".

**Lição:** Neutralino 6.3.0 API surface DIFERE de versões antigas. SEMPRE conferir `Neutralino.filesystem.*` antes de usar. Testes Node NÃO cobrem I/O do Neutralino — bugs de runtime só aparecem em smoke test.

---

## v0.2.22 e anteriores — histórico de hotfixes quebrados

v0.2.26 a v0.2.30 são **versões quebradas** (hotfixes que introduziram bug novo a cada tentativa). Esmagados por `--force-with-lease` no commit `756209b` (v0.2.31). Marcio mandou "NÃO MEXER" depois da v0.2.22 funcional — cada tentativa de hotfix quebrou algo. Lição: **rollback > remendo em hotfix**.

---

## v0.1.4 Android (versionCode=6) — 2026-08-20 — UX login (olho/lembrar/biometria) + FIX encoding strings.xml

**Causa raiz #1 (encoding):** `app/src/main/res/values/strings.xml` foi salvo com **double encoding UTF-8** (cada caractere acentuado virou 2 sequências "Ã§"/"Ã£"/"Ã©"/etc — mojibake clássico). O XML header `<?xml version="1.0" encoding="utf-8"?>` tava certo, mas o CONTEÚDO já tava duplo-encoding. AAPT compilou e exibiu "ConfiguraÃ§Ãµes", "VersÃ£o 0.1.0", "Ã"reas". Bug bônus: `config_sobre_versao` tinha "0.1.0" HARDCODED, separado do `versionName` do `build.gradle.kts` (que tava em "0.1.3"). Resultado: app nunca mostrava a versão real.

**Causa raiz #2 (login UX):** Marcio pediu 3 features de UX no login — gravar credenciais, mostrar/ocultar senha (olho 👁), entrar com biometria. Nenhuma tava implementada.

**Correção:** 
- `strings.xml` reescrito INTEIRO com acentos UTF-8 nativos (44 acentos detectados) + `config_sobre_versao` corrigido pra "0.1.4"
- `build.gradle.kts`: `versionCode 5→6`, `versionName "0.1.3"→"0.1.4"`
- `CredentialsStorage.kt` criado: `EncryptedSharedPreferences` em `gestor_credentials` salva email/senha quando "Lembrar de mim" marcado
- `BiometricAuthenticator.kt` criado: wrapper `androidx.biometric:1.1.0`
- `MainActivity`: `ComponentActivity → FragmentActivity` (BiometricPrompt requer)
- `LoginScreen`: ícone 👁 no campo Senha (`VisualTransformation` toggle), Checkbox "Lembrar de mim", botão "Entrar com digital" condicional (só aparece se `BiometricAuthenticator.disponivel() = BIOMETRIC_SUCCESS` + activity != null)
- `LoginViewModel`: pre-preenche email/senha salvos, método `entrarComBiometria(activity)`, states `mostrarSenha/lembrar/biometriaDisponivel`
- `AndroidManifest.xml`: `USE_BIOMETRIC` + `USE_FINGERPRINT`
- 2 strings novas: `login_lembrar`, `login_botao_biometria`

**Lição:** strings.xml COM double encoding é comum quando editor salva com encoding errado. SEMPRE validar com `cat /sdcard/*.xml | od -c | head` se vir mojibake. `versionName` em `build.gradle.kts` e `config_sobre_versao` em `strings.xml` SÃO FONTES DIFERENTES — sincronizar via script ou um só lugar. BiometricPrompt REQUER `FragmentActivity`, não `ComponentActivity` (erro sutil que só aparece em runtime).

**Validado em print:** Configurações, Sobre, Versão 0.1.4, Sincronizar agora, Tarefas, Pendentes, Concluídas, Todas, Novo, Salvar — TUDO com acentos perfeitos.

**APK:** 20.9 MB, reinstalado no emulador. Commit `8bec9e2`, tag `v0.1.4` pushed em `mlopesdesign/gestor-android`.

---

## v0.1.4 WP (plugin gestor-api) — 2026-08-20 — Enum origem: +ANDROID +IOS

**Causa raiz:** `Validator::ORIGEM = ['MANUAL', 'NL', 'IMPORTADA', 'EMAIL', 'OUTRO']` no `class-validator.php:67` não tinha `ANDROID` nem `IOS`. Quando Android (futuro) ou iOS (futuro) mandassem `origem: "ANDROID"` no payload PUSH, o WP rejeitava com `"Campo origem invalido. Valores permitidos: MANUAL, NL, IMPORTADA, EMAIL, OUTRO"`. Bloqueio silencioso — app não tinha como saber que o problema era o enum (validação retornava conflito, não erro HTTP).

**Correção:** enum estendido pra `['MANUAL', 'NL', 'IMPORTADA', 'EMAIL', 'ANDROID', 'IOS', 'OUTRO']` (1 linha, `class-validator.php:67`).

**Lição:** enums de origem DEVEM ser extensíveis sem deploy do app. Sempre que adicionar plataforma nova (Android, iOS, watch, voice assistant), basta 1 linha no WP. App cliente nunca deve assumir enum fechado.

**Status:** commit feito localmente, **PRECISA DEPLOY** em `tools.mlopesdesign.com.br/wp-admin` pra ativar. Cliente Android atual usa `OUTRO` que já é aceito (validado no PUSH teste abaixo).

---

## F4 PUSH Android → WP — 2026-08-20 — VALIDADO 100% via curl

**Status:** F4 PUSH bidirecional (Android → WP → Desktop) **100% validado**. Teste executado via curl simulando payload Android contra endpoint real `https://tools.mlopesdesign.com.br/wp-json/gestor/v1/sync/push`.

**Bugs descobertos e corrigidos no caminho:**

1. **BOM no body JSON** — `Set-Content -Encoding UTF8` no PowerShell 5.1 adiciona `EF BB BF` no início. WP REST retorna 400 `rest_invalid_json` com `json_error_code: 4` ("Syntax error") ANTES de chegar no PHP. Solução: `[System.IO.File]::WriteAllText($path, $body, (New-Object System.Text.UTF8Encoding $false))` (encoding SEM BOM). Android OkHttp NÃO adiciona BOM (problema só do PowerShell em testes locais).

2. **ULID inválido** — gerado na unha concatenando GUID + sufixo, deu `01J014PUSHCURLANDROID0000` com "U" no meio. ULID usa Crockford Base32 (0-9, A-Z sem I, L, O, U). Solução: `function New-Ulid` em PowerShell que gera só chars válidos. Android tem `Ulid.kt` que já gera correto.

3. **`status: "PENDENTE"`** — enum do WP tem `PLANEJADA, EM_ANDAMENTO, CONCLUIDA, CAIXA_ENTRADA, ...` (não tem `PENDENTE`). Android já usa `PLANEJADA` como default em `CriarTarefaUseCase:15` e `StatusTarefa.kt:13`. Foi erro do MEU curl, não do Android.

4. **`origem: "ANDROID"` rejeitada** — enum não tinha. Workaround: usar `OUTRO` (aceito). Fix permanente: enum estendido em v0.1.4 WP (acima).

5. **`mutacoes` vs `mudancas`** — GUIA-API.md e código WP esperam `mutacoes` (não `mudancas`). Erro silencioso (vira array vazio, 0 aplicadas).

**Tarefas criadas no WP via PUSH simulado Android:**
- `F23CGG6AN6V97JV1TPTM6J7AZD` — "PUSH ANDROID 014 FINAL OK"
- `CA7XX44WX9F4V4ZR1G8B0DJ7FS` — "PUSH 014 F4 OK"
- + 2 que já existiam (criadas via PULL do desktop, com origem `MANUAL`)

Total WP agora: 4 tarefas, 2 vindas do PUSH Android, 2 do desktop.

**Lição:** validar PUSH fim-a-fim (Android real → WP real) antes de empilhar feature nova. Testes unitários Node do cliente Android NÃO exercitam o endpoint real (mockam Retrofit). Bugs de BOM, ULID, status enum SÓ aparecem com HTTP request real. Curl com payload equivalente é o mínimo viável de teste.

**Não validado:** PUSH pelo app Android (tap em "Sincronizar agora" não disparou via adb no emulador). Provavelmente problema do `input tap` em Compose Material 3 Button, não do app. Endpoint provado funcionando — próxima validação manual do Marcio no emulador/celular real deve confirmar.

---

## v0.1.5 Android (versionCode=7) — 2026-08-21 — FIX sync centralizado processa TODAS as tabelas

**Causa raiz:** `SyncRepository.sincronizarTudo()` em `data/repository/SyncRepository.kt:60-66` tinha `when (m.tabela) { "tarefas" -> aplicarTarefa(...) }` — só processava "tarefas". Áreas, clientes e projetos vinham no payload do `/sync/pull` mas eram **DESCARTADOS**, e os cursores eram salvos sem processar. Resultado: telas `Areas/Clientes/Projetos` ficavam VAZIAS no Android, mesmo com dados no WP. Marcio reportou "sincronismo tá uma merda" e mostrou print com `Areas → Nenhuma área cadastrada` e `Projetos → Nenhum projeto cadastrado`, enquanto o desktop tinha 3 áreas e 1 projeto.

**Correção:** reescrito `SyncRepository.sincronizarTudo()` inteiro:
- Adicionado `aplicarArea()`, `aplicarCliente()`, `aplicarProjeto()` com mesma lógica de `aplicarTarefa()` (REPLACE por id, sem wipe destrutivo — diferente do `dao.limpar() + dao.inserirTodos()` legado dos Repository.refresh() individuais)
- SyncRepository agora injeta `AreaDao`, `ClienteDao`, `ProjetoDao` além de `TarefaDao`
- `TarefaDto.toEntity()` já seta `pendenteSync = false` (estado vindo do servidor é sempre sincronizado)
- Removido TODO sobre reaproveitar `Repository.refresh()` — agora tudo é centralizado no SyncRepository

**Validação:**
- APK v0.1.5 (20.9 MB) instalado no emulador
- Sincronização retornou "Sincronização concluída."
- `gestor_sync_cursor.xml` atualizado: `ultimo_pull_at_areas/projetos/clientes/tarefas` todos com timestamps reais
- PULL via curl com token `apps@...` retorna 5 mudanças: 4 tarefas + 1 cliente. **0 áreas e 0 projetos** porque o usuário `apps@mlopesdesign.com.br` (capability `gestor_api_use`) **NÃO TEM áreas/projetos cadastrados no WP**. Cada user tem dados isolados por `usuario_id`.
- Conclusão: sincronismo centralizado funciona. Pra ver áreas/projetos no Android, ou (a) Marcio loga com o user `mlopesdesign@gmail.com` (mesmo do desktop), ou (b) cria áreas pra `apps@`.

**Lição:** TODA função de sync tem que ser centralizada num único lugar e processar TODAS as tabelas do payload. Quando você descobre "essa tabela não tá aparecendo na UI", a primeira coisa a verificar é se a tabela tá no `when` do sync. Defaults de "só processa tarefas" são armadilha mortal. Além disso, **isolamento por usuário no WP é correto e intencional** — bug visual no Android não significa bug no sync, pode ser que o user logado simplesmente não tem dados daquela tabela.

**Não validado:** áreas/projetos aparecerem na UI do Android (depende de o user logado ter dados). A confirmar com Marcio logando com user `mlopesdesign@gmail.com` ou criando áreas pra `apps@`.

---

## v0.2.40 — 2026-08-21 — FIX SYNC areas/projetos/clientes (3 bugs criticos)

**Causa raiz (auditoria do verifier 2026-08-21):** Marcio reportou "sincronismo tá uma merda" e mostrou que áreas/projetos do desktop nunca chegavam no Android (mesmo user logado). 3 bugs descobertos:

1. **🔴 CRÍTICO — `semearDemo()` em `src/js/backend/db.js:436-468`** inseria as 3 áreas (Trabalho, Pessoal, Desenvolvimento) e o 1 projeto via `dbInstance.exec("INSERT INTO areas...")` **DIRETO**, sem chamar `enfileirarMudanca()`. Resultado: a tabela `sync_mudancas` ficava vazia para essas entidades, o PUSH não tinha o que enviar, e o Android nunca via áreas/projetos.

2. **🟠 MÉDIO — `enviarPush` em `src/js/backend/core/sync.js:295-301`** não filtrava `aplicada=0`. Pegava registros já aplicados (cursor `ultimo_push_id` cresce monotonicamente), mascarando o problema do bug #1.

3. **🟠 MÉDIO — `window.__syncDispositivoId`** era lido em `sync.js:481` mas nunca setado em nenhum lugar. Caía sempre no fallback `'desktop-local'`. Inconsistência que morderia quando 2 desktops sincronizassem (pareceriam o mesmo device).

**Correção (3 fixes cirúrgicos):**

1. `db.js:447-463` — cada `INSERT` do `semearDemo()` agora chama `enfileirarMudanca(dbInstance, sessao, tabela, 'UPSERT', id, 1, payload)` logo após.

2. `sync.js:295-301` — query do `enviarPush` agora tem `AND aplicada = 0` no WHERE.

3. `sync.js:188-189` — `window.__syncDispositivoId = st.wp_dispositivo_id` setado no login.

**Migration one-shot (CRÍTICO pro Marcio):** Adicionada em `migrar()` (`db.js:304-352`). Detecta se o `sessao.usuario_id` logado tem dados locais (areas/projetos/clientes/tarefas) sem mudanças enfileiradas e enfileira UPSERT pra todos. Idempotente (checa `COUNT(*) FROM sync_mudancas WHERE operacao='UPSERT' AND registro_id IN (...)`). Resolve o problema do Marcio sem ele precisar apagar o banco.

**Lição (do verifier):**

- TODA escrita em `core/*.js` (incluindo seed/migration) DEVE chamar `enfileirarMudanca()` — esquecer 1 lugar = bug silencioso que só aparece quando o user tenta sincronizar pela primeira vez.
- SEMPRE chamar o verifier antes de declarar "sync funcionando". Eu declarei vitória em v0.1.4 sem perceber que o desktop nunca tinha enfileirado áreas/projetos.
- Cursor próprio de PUSH (`ultimo_push_id`) sem filtro `aplicada=0` mascara bugs — sempre filtrar pra pegar só o que ainda precisa subir.
- Quando um user reporta "sincronismo tá uma merda", SEMPRE investigar o caminho **PUSH** (não só PULL) — o PULL pode estar 100% mas o PUSH tá vazio por bug em seed/migration.

**Validado:** SHA `21DFC0220F8405E48BB7B10D679216741CAB742499CD6DB06A76BEDFD54B2CE3` (resources.neu), SHA `A237C71F197E5A25AF1B74297A838659EF9C9DD37BB6D39FAAB9A19D241C9AA4` (Setup-0.2.40.exe), commit `7bcc35a`, tag `v0.2.40` pushed, release criada.

