# v0.2.34 - FIX versao exibida errada (0.2.25 no app mesmo rodando 0.2.33)

## FIX: meta tag app-version desatualizada
A meta `<meta name="app-version" content="0.2.25">` no `src/index.html` nunca era atualizada pelo `bump-version.mjs`. O `app.js:121-123` lia essa meta PRIMEIRO (antes do `localStorage` e `NEUTRALINO_GLOBALS`), entao o app sempre mostrava 0.2.25 e o auto-update achava que precisava baixar 0.2.33 (mesmo ja rodando a versao mais recente).

## FIX: bump-version.mjs agora sincroniza 6 lugares
1. `neutralino.config.json` (version)
2. `package.json` (version)
3. `src/js/app.js` (comentario + 2 fallbacks)
4. `src/index.html` (meta app-version + meta app-build)
5. `installer/gestor.nsi` (APP_VERSION)
6. `update.json` (version + resourcesURL) - SHA/size ficam pra depois do build

## Bonus: sync.js
`app_versao` e `User-Agent` no `sync.js` foram pra 0.2.34 (a versao do desktop que vai pro WP no /sync/push).

## Detalhes tecnicos
- `src/index.html:6-7`: meta tags corrigidas
- `src/js/backend/core/sync.js:112,157`: User-Agent e app_versao
- `tools/bump-version.mjs`: reescrito pra cobrir todos os 6 lugares + mostrar instrucoes de rebuild

Versao: 0.2.34 (patch, sem downgrade, sem duplicar)
Setup.exe: 5,4 MB | resources.neu: 6,0 MB
