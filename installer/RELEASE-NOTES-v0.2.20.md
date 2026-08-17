# v0.2.20 - FIX "abre neutralinojs.org"

## O bug

Ao clicar "Concluir" no instalador e abrir o app, aparecia uma janela do Neutralinojs mostrando a pagina **neutralinojs.org** (site oficial do framework) em vez do app.

Reproduzido em video pelo Marcio: o app baixado do GitHub abria o navegador embutido do Neutralino com a pagina do site, e o app nao carregava.

## Causa raiz

1. O `neutralino.config.json` NAO estava sendo copiado pro `dist\GestorInteligenteDeDemandas\` pelo `build.mjs`. O `.exe` procura esse arquivo no mesmo diretorio; quando nao acha, ele usa um fallback que abre o site do neutralinojs.
2. O config tambem tinha `tokenSecurity: "one-time"` em vez de `"none"`, o que causava o erro `NE_CL_IVCTOKN` quando a sessao era recriada (cache do WebView2).

## Correcao

- `tools/build.mjs`: copia o `neutralino.config.json` pro `dist\` (e garante `tokenSecurity: none`, `exportAuthInfo: true`)
- `installer/gestor.iss`: ja copia tudo de `dist\GestorInteligenteDeDemandas\*` (Inno Setup), agora incluindo o config

## Instalacao

- **Baixe** `GestorInteligenteDeDemandas-Setup-0.2.20.exe` (7.25 MB)
- SHA-256: `1573F7D706090395CF9881A1B9E3A1A4F2DE59B76FBD2AE3DCED6830E9E45C9F`
- Desinstale a versao anterior antes (se for Inno Setup, o instalador detecta e pergunta; se for NSIS, desinstale via Painel de Controle)
- Os dados em `%APPDATA%\GestorInteligenteDeDemandas\dados\` sao preservados
