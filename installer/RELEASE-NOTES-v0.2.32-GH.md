# v0.2.32 - FIX minimiza e some

## FIX critico: janela off-screen no boot
WebView2 salvava a pos em -32000,-32000 (void do Windows, fora de qualquer monitor) quando o monitor onde o app estava era desconectado. Resultado: app "minimizava e sumia" no proximo boot. Agora `window.center()` e chamado no bootstrap e a janela sempre comeca em posicao visivel.

## FIX: restart agressivo removido do auto-att
`app.js` chamava `app.exit()` + `app.restartProcess()` quando o config do disco estava atrasado. Isso matava o app do nada e o usuario perdia a sessao. Agora o config e atualizado em disco e so passa a valer na proxima abertura. Sem restart surpresa.

## Detalhes tecnicos
- `src/js/app.js:102-117`: window.center() com timeout 1.5s
- `src/js/app.js:201-208`: removido app.exit() e app.restartProcess(); substituido por toast informativo
- API usada: `window.Neutralino.window.center()` (exposta pelo Neutralino 6.3.0)

Versao: 0.2.32 (patch, sem downgrade, sem duplicar)
Setup.exe: 5,4 MB | resources.neu: 6,0 MB
