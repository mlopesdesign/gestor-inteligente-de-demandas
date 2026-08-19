# v0.2.25 — Excluir em tudo + bulk select + subtarefas na UI

> Bump de **patch** (v0.2.24 → v0.2.25). Foco: completar os botões de excluir que faltavam,
> adicionar seleção em massa, e nunca mais travar em erro de inclusão.

---

## O que tem de novo

### 1. Botões de Excluir onde faltava

- **Inbox** (caixa de entrada): botão Excluir ao lado de Concluir/Organizar/Arquivar.
- **Busca global**: botão Excluir em cada resultado (tarefa, projeto, cliente, área). A busca recarrega sozinha depois.
- **Modal de Tarefa** (editar): botão "Excluir tarefa" dentro do próprio modal, sem precisar voltar pra lista.
- **Hoje**: Excluir agora aparece também em tarefas concluídas (antes só em ativas).

### 2. UI de Subtarefas (NOVA)

Antes: subtarefas só existiam no banco, sem UI.
Agora: no modal de edição da tarefa tem uma seção "Subtarefas (N)" com:

- **Adicionar** — input + botão `+` (ou Enter). Flag anti-double-click (não dá pra adicionar 2x em 1ms).
- **Marcar como concluída** — checkbox que risca o texto na hora.
- **Excluir** — botão `×` em cada subtarefa.

**FIX CRÍTICO**: o modal **não fecha+reabre** mais a cada ação de subtarefa. Atualiza in-place. Se der erro na API, alerta e mantém o estado — **nunca trava**.

### 3. Seleção em massa (Bulk select)

Em **Tarefas**, **Inbox** e **Histórico de Backup** (Configurações > Backup):

- Checkbox por linha + checkbox "Selecionar todos" no topo (estado tri: ☑/☐/▣)
- Contador "N de M selecionados" atualiza em tempo real
- Botão "Excluir selecionados" (desabilitado quando 0 marcados)
- Botão "Arquivar selecionados" (só em Tarefas/Inbox)
- Confirmação antes de cada ação em massa
- Relatório final: "X ok, Y falha(s)"

Em Tarefas/Inbox: bulk também tem **Arquivar em massa** além de Excluir.
Em Backup: só Excluir (backup não tem "arquivar").

### 4. Backend novo

- `tarefas:excluirSubtarefa` (rota + permissão + função core) — `DELETE` direto, RLS via subquery.
- Cascade confirmado: excluir tarefa remove as subtarefas (`ON DELETE CASCADE` do schema).

---

## Arquivos modificados (12)

| Arquivo | O quê |
|---|---|
| `src/js/telas/tarefas.js` | modal in-place + bulk select + botão excluir no modal |
| `src/js/telas/inbox.js` | botão Excluir + bulk select |
| `src/js/telas/busca.js` | botão Excluir nos 4 tipos de resultado |
| `src/js/telas/hoje.js` | Excluir visível também em concluídas |
| `src/js/telas/configuracoes.js` | bulk select no histórico de backup |
| `src/js/backend/core/tarefas.js` | `excluirSubtarefa()` |
| `src/js/backend/servidor.js` | rota `tarefas:excluirSubtarefa` |
| `src/js/backend/permissoes.js` | permissão `tarefas:excluirSubtarefa` |
| `src/js/backend/core/sync.js` | User-Agent e `app_versao` → 0.2.25 |
| `src/js/app.js` | fallback de versão → 0.2.25 |
| `src/index.html` | meta `app-version` → 0.2.25 |
| `tests/test-tarefas.mjs` | +8 testes (subtarefas + cascade + RLS) |

Bump também em: `package.json`, `neutralino.config.json`.

---

## Testes

- **17/17 verde** em `test-tarefas.mjs` (era 8, +9 novos: subtarefa add/toggle/excluir/listar, exigir sessao, cascade, RLS outro user, NAO_ENCONTRADO)
- **7/7 suites verde** no geral
- Build: OK (neu build + manual rebuild + app-image 2520 KB + resources.neu 7612 KB)

---

## Não-extensivo (consciente)

Bulk select foi adicionado em **Tarefas / Inbox / Backup** (onde o volume de itens realmente importa).
**Clientes / Projetos / Áreas / Busca-resultados** ficaram só com o Excluir unitário (que já existia ou foi adicionado na v0.2.25).

Se quiser bulk select também nessas telas, é o mesmo padrão — me avisa que eu adiciono.

---

## Como testar

1. Instalar `dist/GestorInteligenteDeDemandas/GestorInteligenteDeDemandas.exe` (v0.2.25)
2. **Tarefas** → marcar 3+ tarefas → "Excluir selecionados" → confirma
3. **Inbox** → marcar todas → "Excluir" → confirma
4. Editar uma tarefa → rolar até "Subtarefas" → adicionar 3 → marcar 1 → excluir 1 → ver que continua na tela
5. **Busca** → buscar "qualquer coisa" → excluir um resultado → ver a busca atualizar
6. **Config > Backup** → marcar 2 backups → "Excluir selecionados"
