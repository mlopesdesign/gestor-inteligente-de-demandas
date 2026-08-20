# v0.2.26 — HOTFIX: aba Sincronização aparecia vazia

> Bump de **patch** (v0.2.25 → v0.2.26). Hotfix crítico pra fazer o sync com a nuvem funcionar.

## O bug

Na v0.2.24 adicionei o sync com a nuvem. O **menu de abas** ficou com 4 itens (Geral, Sincronização, Backup, Atualização), mas faltava o `<div id="tab-sync">` no HTML. Resultado: clicar em "Sincronização" não mostrava nada — tela vazia, sem campo de email/senha, sem botão Entrar.

## O fix

Adicionei o `tab-painel` faltante em `src/js/telas/configuracoes.js`. Agora a aba Sincronização mostra:

- **Se NÃO estiver logado no plugin WP**: form com email + senha + botão "Entrar"
- **Se estiver logado**: email, dispositivo, último sync, mudanças pendentes, conflitos, e botões "Sincronizar agora" + "Desconectar"

## Como usar

1. Atualiza pra v0.2.26 (auto-update ou Setup.exe)
2. **Configurações → Sincronização**
3. Email: o do seu admin WP (cap `gestor_api_use` é automática no role administrator)
4. Senha: a mesma do WP
5. Clica **Entrar** → **Sincronizar agora**

## Compatibilidade

- v0.1.4 do plugin WP não precisa de update
- App Android não precisa de update
- v0.2.25 (delete buttons + bulk select + subtarefas) continua 100%

## Testes

17/17 verde. Fix puramente UI.
