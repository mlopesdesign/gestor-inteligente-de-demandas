# Histórico de versões — Gestor Inteligente de Demandas

> Formato: causa raiz → correção → lição. Não é changelog de marketing.

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
