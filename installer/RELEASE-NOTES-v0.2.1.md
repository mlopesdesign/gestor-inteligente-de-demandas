# Gestor Inteligente de Demandas v0.2.1

**Hotfix critico: o cadastro/login nao persistia entre sessoes.**

## Bug encontrado

O Marcio (proprietario) reportou que o cadastro que ele fez antes dava "credenciais invalidas" no login.

### Causa raiz

`src/js/backend/ambiente.js` definia `const APPDATA = '%APPDATA%'` (string **literal**).

No Windows, `%APPDATA%` nao e expandido automaticamente. O `Neutralino.filesystem.getStats('%APPDATA%\...gestor.db')` recebe a string literal e falha silenciosa. Resultado:

- O app **nunca** conseguia ler nem gravar o banco no caminho certo
- O cadastro era gravado em **memoria** (sql.js in-memory) e **perdido a cada reload do app**
- O "email ja cadastrado" so funcionava **na mesma sessao**

### Banco antigo

Tinha um `gestor_local.db` (20480 bytes, 5 tarefas de demo) com schema simplificado (so a tabela `tarefas`, sem `usuarios`, `sessoes`, `clientes`, etc) - residuo de uma versao de testes. Esse banco foi movido pra `.bak.lixo` (nao deletado) pelo script `tools/limpar-banco-lixo.ps1`.

## Correcoes

1. `ambiente.js`: substituiu `APPDATA = '%APPDATA%'` por `resolverAppdataAsync()` que chama `Neutralino.os.getEnv('APPDATA')` de verdade
2. `app.js`: chama `resolverAppdataAsync()` **antes** do `db.abrir()` pra resolver o caminho
3. `db.js`: `carregarDoDisco()` e `gravarNoDisco()` agora chamam `await resolverAppdataAsync()` e criam o diretorio `dados/` se nao existir
4. `auth.js`: login agora aceita senha vazia (consistente com cadastro que ja permitia)
5. `app.js` (UI): placeholder da senha agora diz "(opcional - deixe vazio se cadastrou sem)"

## O que precisa fazer

1. Instalar o novo `GestorInteligenteDeDemandas-Setup-0.2.1.exe` (como admin)
2. Cadastrar a conta **de novo** (a conta anterior nao existe em lugar nenhum - era so em memoria)
3. **Agora vai persistir**. Pode fechar e abrir o app, login funciona.

## Banco velho

`gestor_local.db` (e seus auxiliares `-shm` e `-wal`) foram renomeados pra `.bak.lixo` em `%APPDATA%\GestorInteligenteDeDemandas\`. Se quiser limpar, e so deletar esses 3 arquivos.

## Tamanho
- Setup.exe: 1.1 MB
- resources.neu: 928 KB

## SHA256
Ver `sha256sums.txt`.
