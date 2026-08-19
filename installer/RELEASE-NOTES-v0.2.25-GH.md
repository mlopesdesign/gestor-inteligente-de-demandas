# v0.2.25 — Excluir em tudo + bulk select + UI de subtarefas

> Bump de **patch** (v0.2.24 → v0.2.25). Foco: completar os botões de excluir que faltavam, adicionar seleção em massa, e nunca mais travar em erro de inclusão.

## 1) Excluir onde faltava

- **Inbox** (caixa de entrada): botão Excluir ao lado de Concluir/Organizar/Arquivar.
- **Busca global**: botão Excluir em cada resultado (tarefa, projeto, cliente, área). A busca recarrega sozinha depois.
- **Modal de Tarefa** (editar): botão "Excluir tarefa" dentro do próprio modal.
- **Hoje**: Excluir agora aparece também em tarefas concluídas.

## 2) UI de Subtarefas (NOVA)

Antes: subtarefas só existiam no banco, sem UI.

Agora, no modal de edição da tarefa tem uma seção "Subtarefas (N)" com:

- **Adicionar** — input + botão `+` (ou Enter). Flag anti-double-click.
- **Marcar como concluída** — checkbox que risca o texto.
- **Excluir** — botão `×` em cada subtarefa.

**FIX CRÍTICO**: o modal **não fecha+reabre** mais a cada ação. Atualiza in-place. Se der erro na API, alerta e mantém o estado — **nunca trava**.

## 3) Seleção em massa (Bulk select)

Em **Tarefas**, **Inbox** e **Histórico de Backup** (Configurações > Backup):

- Checkbox por linha + checkbox "Selecionar todos" no topo (tri-state: ☑/☐/▣)
- Contador "N de M selecionados" atualiza em tempo real
- Botão "Excluir selecionados" + "Arquivar selecionados" (desabilitados quando 0 marcados)
- Confirmação antes de cada ação em massa
- Relatório final: "X ok, Y falha(s)"

## 4) Backend

- `tarefas:excluirSubtarefa` (rota + permissão + função core) — DELETE direto, RLS via subquery.
- Cascade confirmado: excluir tarefa remove as subtarefas (`ON DELETE CASCADE` do schema).

## 5) Testes

- **17/17 verde** em `test-tarefas.mjs` (era 8, +9 novos: subtarefa add/toggle/excluir/listar, exigir sessão, cascade, RLS outro user, NAO_ENCONTRADO)
- **7/7 suites verde** no geral

## Instalação

Baixe o **Setup.exe** abaixo, instale por cima da versão atual. O auto-update também vai oferecer a v0.2.25.

## Não-extensivo (consciente)

Bulk select foi adicionado em **Tarefas / Inbox / Backup** (onde o volume importa). Clientes/Projetos/Áreas/Busca-resultados ficaram só com Excluir unitário. Se quiser bulk lá também, me avisa.

---

*Marcio: se não atualizou, faça o download do Setup.exe (o auto-update via app pode estar com cache da 0.2.22).*
