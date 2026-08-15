# GRAPHIFY — Mapa técnico do Gestor Inteligente de Demandas
_Gerado por `node tools/graphify.mjs` em 2026-08-15T01:38:58.482Z_

## Arquitetura (PADRAO §3.1)

```
src/
  index.html          ← página única
  css/app.css         ← tema dark/light
  js/
    app.js            ← gateway api() e bootstrap
    telas/            ← uma por área do menu
    vendor/           ← sql-wasm.js, neutralino.js (sem npm no cliente)
    backend/
      servidor.js     ← despacha canal → core/*
      db.js           ← wrapper sql.js
      ambiente.js      ← tudo que toca SO
      permissoes.js   ← mapa PERM_ROTA
      core/           ← regras de negócio PURAS
```

## Módulos e dependências

### `app`

Importa: `backend/db`, `backend/servidor`, `backend/ambiente`, `telas/hoge`

### `backend/ambiente`

_Sem dependências internas._

### `backend/core/areas`

_Sem dependências internas._

### `backend/core/auditoria`

_Sem dependências internas._

### `backend/core/auth`

_Sem dependências internas._

### `backend/core/cobrancas`

_Sem dependências internas._

### `backend/core/stubs`

_Sem dependências internas._

### `backend/core/tarefas`

_Sem dependências internas._

### `backend/db`

_Sem dependências internas._

### `backend/permissoes`

_Sem dependências internas._

### `backend/servidor`

_Sem dependências internas._

### `backend/ulid`

_Sem dependências internas._

### `telas/hoge`

_Sem dependências internas._

### `telas/inbox`

_Sem dependências internas._

### `telas/stubs`

_Sem dependências internas._

### `vendor/neutralino`

_Sem dependências internas._

### `vendor/sql-wasm`

_Sem dependências internas._

## Canais expostos pela API (servidor.js)

- `areas:atualizar`
- `areas:criar`
- `areas:excluir`
- `areas:listar`
- `auth:cadastro`
- `auth:login`
- `auth:logout`
- `busca:global`
- `clientes:atualizar`
- `clientes:criar`
- `clientes:excluir`
- `clientes:listar`
- `cobranca:config`
- `cobranca:pendentes`
- `cobranca:tick`
- `config:apagar`
- `config:atualizar`
- `config:exportar`
- `config:obter`
- `ia:parse`
- `ia:status`
- `ia:sugerir`
- `inbox:listar`
- `inbox:processar`
- `projetos:atualizar`
- `projetos:criar`
- `projetos:excluir`
- `projetos:listar`
- `recorrencias:tick`
- `sessao:atual`
- `sync:conflitos`
- `sync:pull`
- `sync:push`
- `sync:resolver`
- `sync:status`
- `tarefas:adiar`
- `tarefas:atualizar`
- `tarefas:cancelar`
- `tarefas:concluir`
- `tarefas:criar`
- `tarefas:listar`
- `tarefas:obter`
- `tarefas:reabrir`

## Permissões por canal (PERM_ROTA)

- areas:atualizar → AREAS
- areas:criar → AREAS
- areas:excluir → AREAS
- areas:listar → AREAS
- auth:cadastro → AUTH
- auth:login → AUTH
- auth:logout → AUTH
- busca:global → BUSCA
- clientes:atualizar → CLIENTES
- clientes:criar → CLIENTES
- clientes:excluir → CLIENTES
- clientes:listar → CLIENTES
- cobranca:config → COBRANCA
- cobranca:pendentes → COBRANCA
- cobranca:tick → COBRANCA
- config:apagar → CONFIG
- config:atualizar → CONFIG
- config:exportar → CONFIG
- config:obter → CONFIG
- ia:parse → IA
- ia:status → IA
- ia:sugerir → IA
- inbox:listar → INBOX
- inbox:processar → INBOX
- projetos:atualizar → PROJETOS
- projetos:criar → PROJETOS
- projetos:excluir → PROJETOS
- projetos:listar → PROJETOS
- recorrencias:tick → COBRANCA
- sessao:atual → AUTH
- sync:conflitos → SYNC
- sync:pull → SYNC
- sync:push → SYNC
- sync:resolver → SYNC
- sync:status → SYNC
- tarefas:adiar → TAREFAS
- tarefas:atualizar → TAREFAS
- tarefas:cancelar → TAREFAS
- tarefas:concluir → TAREFAS
- tarefas:criar → TAREFAS
- tarefas:listar → TAREFAS
- tarefas:obter → TAREFAS
- tarefas:reabrir → TAREFAS

## Armadilhas conhecidas (PADRAO §9)

- Sem BOM UTF-8 no `index.html`, o WebView2 quebra todos os acentos
- `fetch` para download externo é bloqueado por CORS no WebView2 → usar `Neutralino.filesystem` ou PowerShell `Invoke-WebRequest`
- Banco sql.js carrega o .db inteiro na memória → evitar mais de ~50 mil registros
- Atualização: só oferecer versão MAIOR (a bumps de build sobem patch)
