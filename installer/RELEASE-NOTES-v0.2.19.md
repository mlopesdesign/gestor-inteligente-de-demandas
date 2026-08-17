# v0.2.19 - Inno Setup + src/ incluido no instalador

## O que mudou

### 1. Migrado pra Inno Setup
Instalador agora gerado pelo **Inno Setup 7.1** (mesmo que o MLopes Finance usa), nao mais NSIS. Motivo: Inno Setup tem reputacao MUITO maior no Windows SmartScreen, entao o bloqueio cai pra maioria dos usuarios.

- Diretorio de instalacao mudou de `C:\Program Files\Gestor Inteligente de Demandas` pra `%LOCALAPPDATA%\Programs\Gestor Inteligente de Demandas` (sem admin)
- Compressao LZMA2/ultra64: Setup.exe final em **7.25 MB**
- Idioma PT-BR nativo do Inno

### 2. BUG CRITICO corrigido: src/ nao era copiado
Antes o Setup.exe copiava so o `.exe` e o `.neu` do `dist\`. O `src\` (HTML, CSS, JS, imagens) NAO era copiado. Resultado: o app abria a janela do Neutralino com a tela em branco porque o `documentRoot: /` + `url: /src/index.html` aponta pro disco.

Reproduzido no PC do seu irmao: app abria "Neutralino" e ficava em branco. AGORA o `build.mjs` copia o `src\` inteiro pro `dist\` antes do instalador empacotar. Instalacao fresh funciona standalone.

## Instalacao

- Baixe `GestorInteligenteDeDemandas-Setup-0.2.19.exe` (7.25 MB)
- SHA-256: `085B969C0E42F8097DD503641063A8C848C60432AED17CD91C18AD557863515A`
- Ou use o `instalar-windows.bat` (wrapper com bypass automatico do SmartScreen)
- O instalador agora roda SEM administrador (instala em `%LOCALAPPDATA%`)

## Pra quem ja tem versao anterior

- Desinstale a versao NSIS pelo Painel de Controle
- Instale a v0.2.19 (Inno)
- Os dados em `%APPDATA%\GestorInteligenteDeDemandas\dados\` NAO sao apagados (sobe automatico)

## Licao

Todo instalador DEVE incluir o `src/` (ou assets necessarios) na app-image. Validar o fluxo end-to-end (instalar fresh, abrir, ver se carrega) ANTES de publicar. Tinha testado a v0.2.18 so com sync manual — quem baixou o Setup.exe de verdade pegava o bug.
