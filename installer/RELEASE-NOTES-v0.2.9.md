# v0.2.9 — 17/08/2026

## Correcoes

- **DevTools NAO abre mais automaticamente** (`enableInspector: false` no `neutralino.config.json`). Se voce abriu o DevTools manualmente, ele sobrepoe a janela do app — agora isso nao acontece sozinho.
- **Versao do app nao atualizava no header** (ficava mostrando a versao antiga do cache do `NEUTRALINO_GLOBALS`). FIX: meta tag `<meta name="app-version">` no `index.html` como fonte da verdade, o `app.js` le dele no boot.
- **Encoding do `neutralino.config.json` quebrava** os acentos dos textos do tray ("rÃ¡pida" em vez de "rapida"). FIX: gravacao com UTF-8 sem BOM no `instalar-agora.ps1`.

## IMPORTANTE

- Para aplicar o `enableInspector: false`, **tem que reinstalar** o Setup.exe. O auto-update so atualiza o `resources.neu` (codigo do app), NAO atualiza o `.exe` nem o `neutralino.config.json` que estao no disco.
- Se voce so clicar em "Atualizar agora" no toast, o DevTools ainda vai abrir porque o `neutralino.config.json` continua com a versao antiga.
- **Reinstale o Setup.exe v0.2.9** pra parar de ver DevTools abrindo.

## Instalacao

- Baixe o `GestorInteligenteDeDemandas-Setup-0.2.9.exe` (3.2 MB)
- Executa como admin (clica direito > Executar como administrador)
- Substitui a instalacao anterior sem perder dados
- Banco do cliente preservado
