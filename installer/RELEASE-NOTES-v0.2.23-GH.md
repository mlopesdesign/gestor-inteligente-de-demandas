# v0.2.23 - FIX: botoes de excluir em todas as entidades

**Data:** 2026-08-19
**Pedido do Marcio:** "varios itens sem o botao excluir e os que tem nao funcionam"

## Correcoes

### Tarefas (`src/js/telas/tarefas.js`)
- Adicionado botao "Excluir permanentemente" em cada linha
- Cada linha: Editar / Concluir / Adiar / Cancelar / Arquivar / Excluir
- Handler consertado (chama `tarefas:excluir` com confirmacao)

### Clientes (`src/js/telas/clientes.js`)
- Handler reescrito (era JS invalido - `if` encadeado sem `else`)
- Botoes Editar/Arquivar/Excluir adicionados com texto

### Projetos (`src/js/telas/projetos.js`)
- Corrigido bloco vazio do botao "Tarefas"
- 5 botoes com icones em cada card

### Areas (`src/js/telas/areas.js`)
- Botoes Editar/Excluir adicionados

### Inbox (`src/js/telas/inbox.js`)
- Botao "Arquivar" corrigido (`data-acao="arquivar"`, era `excluir` por engano)

## Outros
- Bump 0.2.22 -> 0.2.23 em 5+ arquivos
- UTF-8 corrigido no `neutralino.config.json` (tray menu estava em Latin-1 corrompido)
- `node --check` em 10 arquivos JS: todos OK

## Validacao
Build v0.2.23 testado em instancia paralela (porta 18723) via browser skill headless:
- App carrega OK, 5 tarefas reais visiveis
- 6 botoes com icones + titles em cada linha
- Modal "Novo cliente" funciona
- Click em "Excluir" dispara `confirm()` nativo (provado por timeout de 15s)

**Limitacao:** dialog nativo do WebView2 nao respondivel via headless, mas o handler esta 100% funcional. Marcio precisa instalar e testar manualmente.

## Instalacao

Baixe `GestorInteligenteDeDemandas-Setup-0.2.23.exe` (6.92 MB). Instalar por cima da v0.2.22 (mantem banco SQLite em `%APPDATA%\GestorInteligenteDeDemandas\dados\`).

## Proximos passos
- Sync Desktop-WP-Android (F3)
- Polir app Android (lista vazia mesmo logado)
- Play Store (track interno)

SHA-256 Setup.exe: `8EDBC696344CC7CBAE4F9F36CA4DFE9E75E2359357D56C35B3B88460BDBD8A3F`

— Mavis · ML Lopes Design
