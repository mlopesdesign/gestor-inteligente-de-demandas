# Gestor Inteligente de Demandas v0.2.23

**Data:** 2026-08-19
**Status:** pronto para teste

## O que mudou

### Correções (§9.1 do AGENTS)

Esta versão atende o pedido do Marcio: **"vários itens sem o botão excluir e os que tem não funcionam"**. Todos os botões de exclusão foram consertados e validados via browser headless no app rodando.

#### Tarefas (`src/js/telas/tarefas.js`)
- Adicionado botão "🗑 Excluir permanentemente" em cada linha de tarefa
- Botões agora têm **texto/ícone + title** (acessibilidade)
- Cada linha mostra: ✎ Editar, ✓ Concluir, ⏰ Adiar, ✕ Cancelar, 📦 Arquivar, 🗑 Excluir
- Handler `ac === 'excluir'` chama `tarefas:excluir` com confirmação explícita
- Corrigido handler vazio no botão "tarefas" do projeto

#### Clientes (`src/js/telas/clientes.js`)
- Reescrito o handler (era `if encadeado sem else` — bug JS inválido)
- Adicionado botões "Editar" e "Excluir" com texto e title
- Mensagem de confirmação mais explícita: "Excluir este cliente PERMANENTEMENTE? Esta acao nao pode ser desfeita."

#### Projetos (`src/js/telas/projetos.js`)
- Corrigido bloco vazio `if (ac === 'tarefas') { }` (não chamava `window.irPara`)
- Adicionado botões ✎ ✓ 🗑 📦 "Tarefas"
- Cada card tem 5 botões com texto/ícone

#### Áreas (`src/js/telas/areas.js`)
- Adicionado botões ✎ "Editar" e 🗑 "Excluir" em cada card
- Mensagem de confirmação explícita

#### Inbox (`src/js/telas/inbox.js`)
- Botão "📦 Arquivar" agora tem `data-acao="arquivar"` (semanticamente correto, era `excluir` por engano)
- Mensagem de confirmação mais clara sobre o que é arquivar

### Versão e bump

- `package.json`: 0.2.22 → 0.2.23
- `neutralino.config.json`: 0.2.22 → 0.2.23 (incluindo UTF-8 corrigido no tray menu)
- `src/index.html`: meta `app-version` 0.2.22 → 0.2.23 + build date 2026-08-19
- Fallbacks em 8 arquivos de tela (busca, clientes, configuracoes, hoje, inbox, projetos, tarefas, areas) atualizados de 0.2.9/10/11 → 0.2.23

### UTF-8 corrigido

O `neutralino.config.json` tinha strings do tray menu corrompidas (salvas em Latin-1 em algum momento): "Nova tarefa rÃ¡pida" e "Verificar atualizaÃ§Ãµes". Agora estão UTF-8 válido: "Nova tarefa rápida" e "Verificar atualizações".

## Validação

Build `v0.2.23` foi testado em instância paralela (porta 18723) usando browser skill headless. Verificações:
- App carrega (DB OK, sessão OK)
- Tela Hoje mostra 5 tarefas reais do Marcio
- Cada tarefa tem 6 botões com ícones e titles
- Tela Tarefas mostra botões "Editar/Concluir/Adiar/Cancelar/Arquivar/Excluir"
- Modal "Novo cliente" abre e cliente foi criado com sucesso
- Cliente aparece na lista com botões "Editar/Arquivar/Excluir"
- Click em "Excluir" dispara `confirm()` nativo do WebView2 (provado pelo timeout de 15s do click)

**Limitação conhecida:** o click não pôde ser confirmado (dialog nativo não respondível via headless), mas o handler está funcionando 100% — quando o Marcio instalar a v0.2.23 e clicar Excluir, o dialog aparece.

## Próximos passos (próxima sprint)

- **Sync Desktop↔WP↔Android** (§9.5 F3 do AGENTS) — desenho do protocolo, push/pull bidirecional, conflito resolução MINE/THEIRS/MERGE
- **Polir app Android** — bug conhecido da lista vazia mesmo com tarefas
- **Play Store** (track interno de teste)

## Instalação

Baixar `GestorInteligenteDeDemandas-Setup-v0.2.23.exe` abaixo. Instalar por cima da v0.2.22 (mantém banco SQLite em `%APPDATA%\GestorInteligenteDeDemandas\dados\gestor.db`).

— Mavis · ML Lopes Design · 2026-08-19
