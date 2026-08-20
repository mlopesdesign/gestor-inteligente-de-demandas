# v0.2.28 — HOTFIX CRÍTICO: SQL "no such column: t.versão"

> Bump de **patch** (v0.2.27 → v0.2.28). Hotfix do hotfix.

## O bug

A v0.2.27 introduziu um bug crítico: o script `tools/fix-utf8-double-encoded.py` que eu rodei pra consertar o encoding de strings acentuadas converteu **muitas variáveis/colunas SQL que continham "versao"** (sem acento) em **"versão"** (com acento).

Resultado: as queries SQL falhavam com `no such column: t.versão`, e a tela **Hoje** mostrava "Erro ao carregar tarefas / no such column: t.versão". **Tarefas, projetos, clientes, áreas** estavam todos quebrados.

## A causa

A coluna no schema é `versao` (sem acento):
```sql
CREATE TABLE tarefas (..., versao INTEGER NOT NULL DEFAULT 1, ...);
```

Mas o `fix-utf8-double-encoded.py` viu "versao" em queries (`SELECT t.versao FROM tarefas...`) e achou que era a palavra "versão" sem acento, e adicionou o til. **Errado** — nome de coluna não é texto de UI.

## O fix

Rodei um script de reversão (`tools/_fix-versao-final.py`) que reverte `versão` → `versao` em SQL e nomes de variável JS, mas **NÃO** toca em strings de UI visíveis ao usuário (que devem ficar "Nova versão" mesmo).

Revertido em:
- `src/js/backend/core/areas.js`
- `src/js/backend/core/clientes.js`
- `src/js/backend/core/projetos.js`
- `src/js/backend/core/sync.js`
- `src/js/backend/core/tarefas.js`
- E 20 outros arquivos nas telas

## Testes

17/17 verde. Build limpo.

## Como atualizar

- **Setup.exe direto**: `instaladores\GestorInteligenteDeDemandas-Setup-0.2.28.exe`
- **GH**: https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/tag/v0.2.28

## Lição

**NUNCA** rodar um script de find/replace global em strings UTF-8. O `versao` (sem acento) pode ser nome de coluna/variável/dicionário, e o `versão` (com acento) é o texto de UI. Tratar separadamente.

Da próxima vez: vou fazer um diff antes/depois e revisar cada substituição.
