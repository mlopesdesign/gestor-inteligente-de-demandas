# v0.2.36 — FIX F3 (sync bidirecional)

## Causa raiz
O `enviarPush` em `src/js/backend/core/sync.js` usava `st.ultimo_pull_id` como cursor do PUSH. Mas `ultimo_pull_id` é o **último ID de mudança recebida do servidor** (cursor do PULL), não do PUSH.

Resultado: se um pull anterior tivesse trazido um registro com `id=50`, o push ignorava **qualquer mudança local com id < 50** — mesmo que nunca tivesse sido enviada.

Mesmo com `enfileirarMudanca()` sendo chamado em todos os core, o push filtrado saía vazio.

## Fix (3 lugares em `src/js/backend/core/sync.js`)

1. **`emptyState()`** — adicionado `ultimo_push_id: 0` (cursor próprio do PUSH)
2. **`enviarPush` SELECT** — `WHERE id > st.ultimo_push_id` (era `ultimo_pull_id`)
3. **`enviarPush` cursor update** — `st.ultimo_push_id = maxId` (era `ultimo_pull_id`)

Bônus: normalizado o `r.dados.map(row => ...)` pra aceitar tanto **array de objetos** (better-sqlite3 / setup de teste) quanto **array de arrays** (sql.js / produção). Antes quebrava em runtime com `TypeError: row is not iterable`.

## Validação
- **9 testes novos** em `tests/test-sync.mjs` (48/48 verde total)
  - `enfileirarMudanca` insere em `sync_mudancas` com `aplicada=0`
  - `tarefas.criar` / `atarefas.atualizar` enfileiram automaticamente
  - push envia todas as pendentes e atualiza `ultimo_push_id`
  - segundo push não reenvia (cursor impede)
  - criar tarefa **depois de pull com id alto** não é mais filtrada (regressão coberta)
  - `status` retorna contadores sem chamar WP

## Bug colateral do bump
`tools/bump-version.mjs` lia `gestor.nsi` em UTF-8 e corrompia caracteres PT-BR (`?` no lugar de `ç`/`ã`). Agora lê/escreve em `latin1` pra preservar CP1252 do NSIS. Linha 1 do nsi foi restaurada de `?;` pra `;`.

## Arquivos
- 1 modificado: `src/js/backend/core/sync.js` (3 fixes + compat array/objetos)
- 1 modificado: `tools/bump-version.mjs` (latin1 no nsi)
- 1 restaurado: `installer/gestor.nsi` (linha 1)
- 1 novo: `tests/test-sync.mjs` (9 testes)
- 6 versões: config, package, app.js, index.html, nsi, update.json

## Tamanhos
- `resources.neu`: 6.313.637 bytes (SHA `FBE390EE...`)
- `Setup.exe`: 5.442.310 bytes
