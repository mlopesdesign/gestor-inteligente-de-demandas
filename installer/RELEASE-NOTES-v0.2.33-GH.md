# v0.2.33 - FIX maximizar/restore limbo + auto-update reinicia

## FIX: maximizar/restore joga a janela pro limbo
O WebView2 restaurava a janela em estado maximized mas com tamanho NAO-maximizado (1200x760 em vez de 1920x1080). Quando o usuario clicava no botao maximizar, o SW_RESTORE tentava ir pro rcNormalPosition salvo em MAX_INT (32767, -32768) - a janela ia pro limbo e nao voltava. Agora:
- app.js detecta isMaximized + size<1500 no boot e forca restaurar + centralizar
- Listener de resize captura posicoes invalidas (|x|>10000 ou |y|>10000) e recentraliza

## FIX: auto-update reinicia o app sozinho
`aplicarAtualizacao` usava `app.exit()` em vez de `app.restartProcess()`. App fechava apos atualizar e o usuario tinha que abrir manual. Agora usa `restartProcess()` e o app reabre sozinho.

## Detalhes tecnicos
- `src/js/app.js:132-167`: deteccao de "falso maximized" no boot
- `src/js/app.js:169-198`: listener de resize com debounce 200ms
- `src/js/app.js:641-644`: restartProcess em vez de exit
- APIs do Neutralino 6.3.0 usadas: `window.isMaximized()`, `window.getSize()`, `window.getPosition()`

Versao: 0.2.33 (patch, sem downgrade, sem duplicar)
Setup.exe: 5,4 MB | resources.neu: 6,0 MB
