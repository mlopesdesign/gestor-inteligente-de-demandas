# v0.2.31 — Limpeza pós hotfix cascade

## 🐛 FIX CRÍTICO: banco agora persiste em disco
`db.js` chamava API inexistente (`removeFile`) em 9 lugares. Trocado por `remove()` (API correta da v6.3.0). Banco não era gravado em disco desde sempre, só em localStorage. Cada abertura do app ressuscitava banco vazio.

## 🐛 FIX CRÍTICO: sync 100% quebrado desde v0.2.24
`sync.js:96` usava `window.NL_CORS` (não existe). Trocado por `!window.NL_PORT`. Sync com plugin WP volta a funcionar.

## 🧹 Higiene
- 9 instaladores antigos → `installer/.obsoleto/`
- `gestor.iss` (Inno Setup morto) → obsoleto
- `paleta-amarela/` (1,5 MB não usado) → obsoleto
- `smoke-test.mjs` (debug obsoleto) → obsoleto
- `.git/rebase-merge/` stale limpo
- Dados locais e cache WebView2 zerados (backup em workspace)

## ✅ Testes
39/39 verde. Build limpo. SHA256 do `.neu` corrigido no `update.json` (era do Setup.exe antes).

**Versão**: 0.2.31 (sem downgrade, sem duplicar)
**Setup.exe**: 5,4 MB | **resources.neu**: 6,0 MB
