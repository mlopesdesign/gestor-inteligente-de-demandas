# v0.2.18 - Botoes de Excluir em todas as entidades

## O que mudou

| Entidade | Antes | Agora |
|---|---|---|
| **Tarefas** | Editar + Concluir | Editar + Concluir + **Excluir** |
| **Clientes** | Editar + Arquivar | Editar + Arquivar + **Excluir** |
| **Projetos** | so Editar | Editar + Concluir + **Excluir** |
| **Areas** | Editar + Excluir | (sem mudanca) |

## Comportamento

- Clique em **Excluir** dispara confirmacao JavaScript (`confirm()`)
- Se houver entidades vinculadas (cliente com tarefas/projetos, projeto com tarefas, area com tarefas), o backend retorna `EM_USO` e o app mostra mensagem clara pedindo reatribuicao
- Apos excluir, a lista recarrega automaticamente
- Auditoria grava `excluida`/`excluido` com ID

## Motivacao

Pedido direto: "qualquer coisa tem que ter a opcao de exclusao, se erro vou olhar pro erro o resto da vida?" — agora da pra limpar entidades que foram criadas por engano.

## Instalacao

Baixe `GestorInteligenteDeDemandas-Setup-0.2.18.exe` (5.36 MB).
SHA-256: `FEBF40BB1287C7EC921C7C43C05C487410C5764C49FCA31795FE120BEE85C0FA`

## Proxima

- Auto-update comecou a checar v0.2.18 (gh-pages ja publicado)
- Toast "Nova versao disponivel" deve aparecer no app que ainda estiver na v0.2.17
