## v0.2.7 — 16/08/2026

### Novos
- **Ícone NOVO** em amarelo (#F0A000) com letra "G" branca. Substitui a versão azul antiga que tinha logo mlopes dev.
- **Auto-update pelo GitHub** — o app checa o `update.json` no GitHub Pages a cada 6h e mostra um toast com botao "Atualizar agora" quando tem versao nova. Click baixa e reinicia.
- **Banco persiste entre execucoes** — corrigido bug onde o `env.noApp` era sempre `false` (vendor do neutralino nao define `app.isNative`), fazendo o app cair no `localStorage` (que e por origin, porta dinamica = perda total).
- **Porta fixa 8723** no servidor do Neutralino (era 0 = dinamica), pra `localStorage` ser consistente.

### Correcoes
- **Bug do `neu build` (3 bytes)** — o CLI adiciona 3 bytes de padding no `.neu` que corrompe o `neutralino.js` vendor. Contornado: **embed inline** do `neutralino.js` no `index.html` (o navegador usa o inline, ignora o corrompido no .neu).
- **Bug `salvarAgora is not defined`** — faltava `this.`/`db.` na chamada no `db.js`.
- **Bug `await Neutralino.filesystem.*` pendurando** — o `init()` nao e chamado (bug do `neu build`), fazendo as Promises ficarem pra sempre. Helper `withTimeout(promise, ms, label)` em todas as chamadas do filesystem.

### Detalhes tecnicos
- Stack: JavaScript ES2020+ + Neutralino.js 6.3.0 + sql.js + WebView2 + NSIS 3.10
- Tamanho: instalador 3.2 MB, app 5.6 MB
- Zero runtime instalado (WebView2 ja vem no Windows)
- Banco SQLite em `%APPDATA%\\GestorInteligenteDeDemandas\\dados\\gestor.db` (com fallback localStorage se filesystem nao disponivel)
- Auto-update verifica `https://mlopesdesign.github.io/gestor-inteligente-de-demandas/update.json`
