# v0.2.22 - FIX icone dos atalhos

**Bug**: atalho na Area de Trabalho e Menu Iniciar com icone GENERICO do Windows em vez da lampada MLOPES DEV.

**Causa**: `installer/resources/icon.ico` nao estava sendo copiado pro dist. `IconFilename` no .iss apontava pro .exe (icone generico do Neutralino).

**Fix**: build.mjs copia o icon.ico pro dist, e IconFilename aponta direto pro {app}\icon.ico.

**Setup.exe**: 7.25 MB. SHA-256: `B4C4FB0ECB6F9CD3B1B8C16AAFB15CE3F497FB0793FD8E4854B7A3123BAF9E18`
