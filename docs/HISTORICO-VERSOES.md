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
