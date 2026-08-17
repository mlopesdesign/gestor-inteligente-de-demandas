# v0.2.17 — FIX CRÍTICO: auto-update parou de abrir o navegador

## O bug (v0.2.14 até v0.2.16)

Ao clicar **"Atualizar agora"** em **Configurações → Atualização**, o app abria
o navegador padrão (Edge) com a URL do `.neu` no GitHub (ou, em alguns casos,
redirecionava pra `neutralinojs.org`).

O Marcio ficou MUITO puto com isso: "VC QUEBROU TUDO", "ABRIU GITHUB? PQ NÃO
ATUALIZOU A PORRA AUTOMATICAMENTE COMO EU MANDEI".

## Causa raiz

1. **`app.js:aplicarAtualizacao(info)`** tinha um fallback que chamava
   `Neutralino.os.open(info.resourcesURL)` ou `window.open(info.resourcesURL, '_blank')`
   — ambos ABREM o navegador padrão com a URL do `.neu`. Esse fallback era
   executado quando o caminho principal (fetch + writeFile do base64) falhava
   (e ele SEMPRE falhava porque `writeFile` com string base64 corrompe o binário).

2. **`backend/ambiente.js`** ainda tinha as funções `verificarUpdate()` e
   `aplicarUpdate()` que chamavam `Neutralino.updater.checkForUpdates()` e
   `applyUpdate()` — esses métodos da Neutralino ABREM o navegador com a URL
   do manifest (e sem URL explícita, vão pra `neutralinojs.org`).

A v0.2.16 corrigiu o `app.js` mas esqueceu do `ambiente.js`. A v0.2.17 corrige
os dois.

## Correção (v0.2.17)

- **`app.js:aplicarAtualizacao(info)`** REESCRITA do zero. Usa AGORA
  `Neutralino.os.execCommand` com PowerShell + `Invoke-WebRequest` (nativo do
  Windows 10/11) pra baixar o `.neu` direto, validar tamanho mínimo, fazer
  backup do anterior como `.old`, mover o novo pro lugar. SEM abrir navegador
  em hipótese nenhuma. Se falhar, mostra erro claro e pede download manual.

- **`backend/ambiente.js`** — REMOVIDAS as funções `verificarUpdate()` e
  `aplicarUpdate()`. Eram lixo morto no fluxo de produção, mas poderiam ser
  chamadas por algum código futuro. Não existem mais.

- **Sem fallback de navegador.** Se o download automático falhar, o user vê
  a mensagem de erro com a URL pra baixar manualmente. O app NUNCA abre
  Edge/Chrome/Firefox sozinho.

## Como verificar

1. Abra o app (v0.2.17 já está instalada).
2. Vá em **Configurações → Atualização**.
3. Clique em **"Verificar atualizações"**. Se houver versão mais nova, aparece
   um toast "Nova versão disponível".
4. Clique em **"Atualizar agora"**.
5. **Confirme:** NENHUMA janela do navegador abre. O app baixa silencioso
   pelo PowerShell, valida, move e reinicia.

Se você ver qualquer navegador abrir durante esse fluxo, é bug — reporte
com print + log em `%APPDATA%\GestorInteligenteDeDemandas\logs\app-debug.log`.

## Instalação

Baixe `GestorInteligenteDeDemandas-Setup-0.2.17.exe` (5.36 MB) abaixo.
SHA-256: `9F290545EC185AFD63778EB333E59A455572B16ACBBF7EA5E30EBA0EBB493088`

Se o Windows bloquear com SmartScreen, use o `instalar-windows.bat` (mesma
função, com bypass automático do Mark-of-the-Web).

## Lição aprendida (pra mim)

**Nunca mais publicar uma versão de update sem testar o flow de "Atualizar
agora" end-to-end, clicando o botão e observando o que acontece.** A v0.2.14
já tinha problema parecido e eu corrigi só o `app.js` achando que era o único
lugar. Errado. Tem que testar o botão, ver o que abre, e confirmar que o
comportamento é o esperado.

— Gestor Inteligente de Demandas v0.2.17, 17/08/2026
