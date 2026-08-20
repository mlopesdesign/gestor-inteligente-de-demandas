## v0.2.36 — FIX F3 (sync bidirecional)

**Causa raiz:** `enviarPush` usava `ultimo_pull_id` (cursor do PULL) como filtro do PUSH. Pull anterior com id alto ignorava mudanças locais com id menor.

**Fix:** cursor próprio `ultimo_push_id`. Normalizado `r.dados` pra aceitar array de objetos e array de arrays.

**Validação:** 9 testes novos de sync (48/48 total). Cobertura: enfileirarMudanca, push envia, cursor impede reenvio, regressão do id alto.

**Bônus:** `bump-version.mjs` agora lê `gestor.nsi` em latin1 (preserva CP1252 do NSIS; antes virava `?` em PT-BR).

Detalhes: `installer/RELEASE-NOTES-v0.2.36.md`
