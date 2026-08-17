# v0.2.20 - FIX "abre neutralinojs.org"

**Causa**: `neutralino.config.json` nao estava sendo copiado pro app-image. Sem ele, o .exe abria a pagina default do neutralino (neutralinojs.org).

**Fix**: `build.mjs` agora copia o config pro dist/, e usa `tokenSecurity: none` + `exportAuthInfo: true` (resolve NE_CL_IVCTOKN).

**Instalacao**: `GestorInteligenteDeDemandas-Setup-0.2.20.exe` (7.25 MB)
**SHA-256**: `1573F7D706090395CF9881A1B9E3A1A4F2DE59B76FBD2AE3DCED6830E9E45C9F`
