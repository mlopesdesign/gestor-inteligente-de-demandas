# v0.2.35 - FIX aba Sincronizacao vazia

## FIX: tab-sync faltava no template
O `renderConfig` em `configuracoes.js` tinha 3 divs `tab-painel` (`tab-geral`, `tab-atualizacao`, `tab-backup`) mas FALTAVA o `tab-sync`. A funcao `carregarSyncStatus()` existia e procurava por `#sync-status-area`, mas esse elemento nao existia no DOM. Resultado: clicar na aba Sincronizacao mostrava tela em branco.

## FIX: mensagem "Aguardando autorizacao"
Agora a aba Sync exibe uma mensagem explicando o que vai ter quando o Marcio liberar F3 (sync bidirecional desktop). O painel de sync em si (status, botao "Sincronizar agora", conflitos) continua bloqueado ate autorizacao explicita (AGENTS.md §9.1 e §9.5).

## Detalhes tecnicos
- `src/js/telas/configuracoes.js`: adicionado `<div class="tab-painel" id="tab-sync">` com placeholder
- A funcao `carregarSyncStatus()` continua existindo pra quando F3 for liberado - so precisa ativar a chamada

Versao: 0.2.35 (patch, sem downgrade, sem duplicar)
Setup.exe: 5,4 MB | resources.neu: 6,0 MB
