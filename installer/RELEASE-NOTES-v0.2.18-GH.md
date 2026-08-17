# v0.2.18 - Botoes de Excluir

**Tarefas, Clientes, Projetos** ganharam botao **Excluir** (Areas ja tinha).

| Entidade | Botoes |
|---|---|
| Tarefas | Editar + Concluir + **Excluir** |
| Clientes | Editar + Arquivar + **Excluir** |
| Projetos | Editar + Concluir + **Excluir** |

Excluir dispara `confirm()` antes de chamar o backend. Bloqueia com `EM_USO` se houver vinculos (cliente com tarefas/projetos, projeto com tarefas, area com tarefas) e pede reatribuicao.

**Instalacao:** `GestorInteligenteDeDemandas-Setup-0.2.18.exe` (5.36 MB).
SHA-256: `FEBF40BB1287C7EC921C7C43C05C487410C5764C49FCA31795FE120BEE85C0FA`
