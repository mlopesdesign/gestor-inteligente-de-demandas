# v0.2.19 - Inno Setup + src/ no instalador

**Migrado de NSIS pra Inno Setup 7.1** (mesmo empacotador do MLopes Finance). Motivo: Inno tem muito mais reputacao no Windows SmartScreen.

**BUG CRITICO corrigido**: o Setup.exe antes copiava so o `.exe` e o `.neu` — o `src/` nao ia. Resultado: app abria janela em branco no PC do usuario. Agora `build.mjs` copia o `src/` inteiro. Validado instalacao fresh em pasta temp — app sobe normalmente.

**Setup.exe**: 7.25 MB (LZMA2/ultra64)
**Instalacao**: `%LOCALAPPDATA%\Programs\` (sem admin)
**SHA-256**: `085B969C0E42F8097DD503641063A8C848C60432AED17CD91C18AD557863515A`
