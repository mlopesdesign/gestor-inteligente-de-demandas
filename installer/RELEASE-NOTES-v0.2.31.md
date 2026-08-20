# v0.2.31 — Limpeza pós hotfix cascade (v0.2.26-30 quebrados)

> Marcio dormiu, autorizou resolução autônoma desde que não quebrasse as regras (sem downgrade, sem duplicar versão, sem mexer no banco WP). Esta é a release de retorno ao estado funcional, com 3 bugs críticos corrigidos no caminho.

## 🔴 FIX CRÍTICO #1 — Banco agora PERSISTE em disco (`src/js/backend/db.js`)

A v0.2.25 (e a v0.2.26-30) tinham um bug silencioso: `db.js` chamava `window.Neutralino.filesystem.removeFile(path)` que **NÃO EXISTE** na v6.3.0 do Neutralino. A API correta é `remove(path)`. Toda gravação do banco caía no fallback certutil, mas esse fallback TAMBÉM chamava `removeFile`, então NENHUMA gravação em disco funcionava. O banco só existia em `localStorage` do WebView2, e como a porta muda entre execuções, o banco "ressuscitava vazio" a cada abertura.

- 9 ocorrências corrigidas em `db.js` (linhas 134, 139, 201, 202, 203, 217, 220, 229, 230)
- Banco agora persiste em `%APPDATA%\GestorInteligenteDeDemandas\dados\gestor.db`
- Log deixa de mostrar `removeFile is not a function` (79 ocorrências no `db.log` da v0.2.25, 0 na v0.2.31)
- Log passa a mostrar `SUCESSO via certutil+move, size=...` na primeira gravação

## 🔴 FIX CRÍTICO #2 — certutil em PT-BR (`src/js/backend/db.js`)

Mesmo com o fix do `removeFile`, o certutil ainda falhava. Causa: o código procurava `'successfully'` em `r.stdOut`, mas em Windows **PT-BR** a saída do certutil é "concluído com êxito" (sem "successfully"). Toda gravação caía no fallback localStorage, mesmo com `remove` funcionando.

- Aceita `'successfully'`, `'êxito'`, `'concluído'` OU `r.exitCode === 0` (mais robusto)
- 2 ocorrências corrigidas em `db.js` (linhas 137, 213)
- **Confirmação em smoke test** (02:56:09 BRT 2026-08-20): `db.log` mostra `gravarNoDisco: SUCESSO via certutil+move, size=303104` e `gestor.db` aparece em disco com 303.104 bytes (idêntico ao localStorage)

## 🔴 FIX CRÍTICO #3 — Sync 100% quebrado desde v0.2.24 (`src/js/backend/core/sync.js`)

`sync.js:96` usava `window.NL_CORS` que não existe na v6.3.0 (a constante correta é `NL_PORT`). `detectNoApp()` sempre retornava `true`, fazendo todas as funções de sync (`login`, `executar`, `push`, `pull`) responderem `OFFLINE` silenciosamente.

- Trocado `!window.NL_CORS || !window.NL_PORT` por apenas `!window.NL_PORT` (1 linha)
- Sync com plugin WP `https://tools.mlopesdesign.com.br/wp-json/gestor/v1` volta a funcionar

## 🔴 FIX CRÍTICO — Sync 100% quebrado desde v0.2.24 (`src/js/backend/core/sync.js`)

`sync.js:96` usava `window.NL_CORS` que não existe na v6.3.0 (a constante correta é `NL_PORT`). `detectNoApp()` sempre retornava `true`, fazendo todas as funções de sync (`login`, `executar`, `push`, `pull`) responderem `OFFLINE` silenciosamente.

- Trocado `!window.NL_CORS || !window.NL_PORT` por apenas `!window.NL_PORT` (1 linha)
- Sync com plugin WP `https://tools.mlopesdesign.com.br/wp-json/gestor/v1` volta a funcionar

## 🔧 HIGIENE

- **9 instaladores antigos** (`Setup-0.2.20.exe` a `Setup-0.2.30.exe`, ~65 MB) movidos para `installer/.obsoleto/`
- **`installer/gestor.iss`** (script Inno Setup, código morto desde v0.2.19 quando o build migrou pra NSIS) movido pra obsoleto
- **`src/resources/images/paleta-amarela/`** (1,5 MB, nunca referenciado) movido pra obsoleto
- **`tools/smoke-test.mjs`** (debug obsoleto do bug de `versão`/`versao` que já foi resolvido) movido pra obsoleto
- **`.git/rebase-merge/`** stale (resíduo da hotfix cascade) limpo

## 🗑️ DADOS LOCAIS

- `%APPDATA%\GestorInteligenteDeDemandas\dados\` (banco + backups vazios) — backup em `E:\Projetos\LOPES FOCUS\_backup-dados-app-2026-08-20\dados\`
- `%APPDATA%\GestorInteligenteDeDemandas\resources.neu` + `.old` (versões auto-updated conflitantes) — backup em `_backup-dados-app-2026-08-20\`
- `%APPDATA%\GestorInteligenteDeDemandas.exe\EBWebView\` (cache WebView2 corrompido, 57 MB) — backup em `_backup-dados-app-2026-08-20\EBWebView\`

Tudo preservado em `_backup-dados-app-2026-08-20\` caso precise de rollback.

## ✅ TESTES

- **39/39 testes Node passam** (7 suites: áreas 4, busca 2, clientes 3, cobranças 6, config 4, projetos 3, tarefas 17)
- **Smoke test runtime** (02:56:09 BRT 2026-08-20): app abre, banco carrega do localStorage (303.104 bytes), grava em disco via certutil+move com sucesso, sem `removeFile is not a function`, sem `certutil falhou`
- Build limpo (sem warnings fatais; NSIS deu 7 warnings cosméticos de LangString duplicados)
- SHA256 do `.neu` calculado corretamente (era o bug P3 do `update.json` — publicava SHA do Setup.exe em vez do .neu)

## 📦 ARTEFATOS

| Arquivo | Tamanho | SHA256 |
|---|---|---|
| `GestorInteligenteDeDemandas-Setup-0.2.31.exe` | 5.440.929 bytes (5,4 MB) | `71462EF5AD566FF68812CC4050D4639B4A348D4EF14364CEED6C1D071CBBD980` |
| `resources.neu` | 6.303.313 bytes (6,0 MB) | `04E9A3BA94E0E8E7A81F83AA69E19C49D7F3552B80BBB7B93218F7B862AC0C00` |

## ⚠️ RISCOS RESIDUAIS

1. **"Minimiza" no startup** — não consegui reproduzir/causar root. Pode ser WebView2 corrompido (agora limpo) ou bug de runtime do Neutralino. Monitorar após uso.
2. **Auto-update sem validação de SHA client-side** — `aplicarAtualizacao()` em `app.js` baixa e move o `.neu` sem checar SHA/size. Risco latente de MITM (mitigado só pelo HTTPS do GitHub).
3. **Tests não cobrem I/O do Neutralino** — testes rodam com `better-sqlite3` no Node, não com `sql.js` no WebView2. Bugs de I/O (como o `removeFile`) só são pegos em smoke test runtime.

---

**Versão**: 0.2.31 (patch, sem downgrade, sem duplicar — pula as v0.2.26-30 quebradas)
**Base**: 0f8b2b8 (v0.2.25) + 2 fixes (db.js, sync.js)
**Commits novos**: em `pre-fix-v0.2.31` branch de backup
