# v0.2.17 — FIX CRÍTICO: auto-update parou de abrir o navegador

Ao clicar "Atualizar agora" o app abria o Edge (ou `neutralinojs.org` em
alguns casos). Causa: fallback `os.open`/`window.open` no `app.js` e
`checkForUpdates` ainda no `ambiente.js`. v0.2.16 corrigiu só metade.

**Correção v0.2.17:**
- `app.js:aplicarAtualizacao()` REESCRITA — usa PowerShell `Invoke-WebRequest`
  via `os.execCommand`. SEM fallback de navegador.
- `ambiente.js` perdeu as funções `verificarUpdate`/`aplicarUpdate` (eram
  lixo morto, mas perigosas).
- Em caso de falha, mostra erro e pede download manual — nunca abre browser.

**Instalação:** `GestorInteligenteDeDemandas-Setup-0.2.17.exe` (5.36 MB).
SHA-256: `9F290545EC185AFD63778EB333E59A455572B16ACBBF7EA5E30EBA0EBB493088`

Se o Windows bloquear com SmartScreen, use o `instalar-windows.bat` (bypass
automático do Mark-of-the-Web).

**Lição:** nunca publicar update sem testar o botão end-to-end.
