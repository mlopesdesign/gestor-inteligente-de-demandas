# v0.2.22 - FIX icone dos atalhos

## O bug

O atalho do "Gestor Inteligente de Demandas" na Area de Trabalho e no Menu Iniciar estava com o icone GENERICO do Windows (pagina com imagem) em vez da lampada MLOPES DEV. App tava rodando normal, mas o atalho tava com icone errado.

## Causa

1. O `installer/resources/icon.ico` NAO estava sendo copiado pro `dist/GestorInteligenteDeDemandas/` pelo `build.mjs`.
2. O `IconFilename` no `gestor.iss` apontava pro `.exe` (que tem icone generico do Neutralino), nao pro `.ico` diretamente.

## Correcao

- `tools/build.mjs`: agora copia o `installer/resources/icon.ico` pro dist
- `installer/gestor.iss`: `IconFilename` agora aponta direto pro `{app}\icon.ico` em vez do exe

## Instalacao

Baixe `GestorInteligenteDeDemandas-Setup-0.2.22.exe` (7.25 MB).
SHA-256: `B4C4FB0ECB6F9CD3B1B8C16AAFB15CE3F497FB0793FD8E4854B7A3123BAF9E18`

Desinstale qualquer versao anterior antes (atalho antigo sera apagado junto). Os dados em `%APPDATA%\GestorInteligenteDeDemandas\dados\` sao preservados.
