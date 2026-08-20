# v0.2.31 — Limpeza pos hotfix cascade

## FIX CRITICO: banco agora persiste em disco
db.js chamava API inexistente (removeFile) em 9 lugares. Trocado por remove() (API correta da v6.3.0). Banco nao era gravado em disco desde sempre, so em localStorage. Cada abertura do app ressuscitava banco vazio.

## FIX CRITICO: sync 100% quebrado desde v0.2.24
sync.js:96 usava window.NL_CORS (nao existe). Trocado por !window.NL_PORT. Sync com plugin WP volta a funcionar.

## FIX CRITICO: certutil em PT-BR
db.js aceitava so 'successfully' em r.stdOut, mas em Windows PT-BR a saida do certutil e 'concluido com exito'. Toda gravacao caia no fallback localStorage. Agora aceita exitCode=0 OU texto PT-BR/EN. Confirmado em smoke test (02:56:09 BRT 2026-08-20): db.log mostra 'gravarNoDisco: SUCESSO via certutil+move, size=303104'.

## Higiene
- 9 instaladores antigos -> installer/.obsoleto/
- gestor.iss (Inno Setup morto) -> obsoleto
- paleta-amarela/ (1,5 MB nao usado) -> obsoleto
- smoke-test.mjs (debug obsoleto) -> obsoleto
- .git/rebase-merge/ stale limpo
- Dados locais e cache WebView2 zerados (backup em workspace)

## Testes
39/39 verde. Build limpo. SHA256 do .neu corrigido no update.json (era do Setup.exe antes).

Versao: 0.2.31 (sem downgrade, sem duplicar)
Setup.exe: 5,4 MB | resources.neu: 6,0 MB
