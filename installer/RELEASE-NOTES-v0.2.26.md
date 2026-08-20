# v0.2.26 — HOTFIX: aba Sincronização aparecia vazia

> Bump de **patch** (v0.2.25 → v0.2.26). Hotfix crítico pra fazer o sync com a nuvem funcionar.

---

## O bug

Na v0.2.24 eu adicionei o sync com a nuvem (sync.js + aba Sincronização). O **menu de abas** ficou com 4 itens (Geral, Sincronização, Backup, Atualização), mas na hora de renderizar o conteúdo de cada aba, esqueci de criar o `<div id="tab-sync">` no HTML. Resultado: clicar em "Sincronização" não mostrava nada — tela vazia, sem campo de email/senha, sem botão Entrar.

Isso bloqueou qualquer tentativa de conectar o desktop ao plugin WordPress.

## O fix

Adicionei o `tab-painel` faltante em `src/js/telas/configuracoes.js`. Agora a aba Sincronização mostra:

- **Se NÃO estiver logado no plugin WP**: form com campo de email + senha + botão "Entrar"
- **Se estiver logado**: mostra email, ID do dispositivo, último sync, mudanças pendentes, conflitos, e botões "Sincronizar agora" + "Desconectar"

Mesma UI que tava prevista na v0.2.24. Só faltava o container HTML.

## Como usar (pós-update)

1. **Atualiza o app** (v0.2.25 → v0.2.26 via auto-update ou Setup.exe)
2. **Configurações → Sincronização** (a aba agora aparece com conteúdo)
3. **Email**: o do seu admin WP (que tem cap `gestor_api_use` — automática no role administrator)
4. **Senha**: a mesma do WP
5. Clica **Entrar** → se 200 OK, tá logado
6. Clica **Sincronizar agora** → puxa/pusha tarefas, projetos, clientes, áreas

## Arquivos modificados (1)

| Arquivo | Mudança |
|---|---|
| `src/js/telas/configuracoes.js` | Adicionado `<div class="tab-painel" id="tab-sync">` com card de sync + area de status + area de resultado |

Bump em 5 lugares: `neutralino.config.json`, `package.json`, `src/js/app.js`, `src/index.html`, `src/js/backend/core/sync.js` (User-Agent + app_versao).

## Testes

17/17 verde (não mudou nada nos testes; fix é puramente UI).

## Não-mudou

- v0.2.25 (delete buttons + bulk select + subtarefas) continua 100%
- v0.1.4 do plugin WP não precisa de update
- App Android não precisa de update

## Instalação

1. **Mais rápido**: auto-update do app. Ele vai detectar a v0.2.26.
2. **Direto**: baixa o Setup.exe do link abaixo.
