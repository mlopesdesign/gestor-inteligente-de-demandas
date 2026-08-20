# v0.2.27 — HOTFIX CRÍTICO: encoding UTF-8 double-encoded

> Bump de **patch** (v0.2.26 → v0.2.27). Hotfix crítico: TODAS as strings acentuadas estavam aparecendo com bug de encoding no app.

## O bug

Ao usar o `edit` tool, os caracteres acentuados em UTF-8 (`ç`, `ã`, `é`, etc) passaram por uma camada no meio que interpretou como Latin-1, e o resultado foi gravado DE NOVO como UTF-8. Resultado:

- `Sincronização` → `SincronizaÃ§Ã£o`
- `Configurações` → `ConfiguraÃ§Ãµes`
- `versão` → `versÃ£o`
- `Nova versão disponível` → `Nova versÃ£o disponÃ­vel`

A v0.2.25, v0.2.24 e anteriores TAMBÉM tinham o bug. Só ninguém tinha notado porque o app parecia OK em ASCII.

**A v0.2.26 ficou inútil pra Marcio** porque o painel de Sincronização (que era a única coisa que ele queria ver) tinha "SincronizaÃ§Ã£o" no título.

## O fix

Script Python que detecta padrões de double-encoding e decodifica uma camada Latin-1 pra UTF-8:
- **405 substituições** em 28 arquivos
- Todos os `.js`, `.html`, `.css`, `.json` do `src/` corrigidos
- Nada de mudança de lógica, só encoding

## Como usar (instalação LIMPA)

**Setup.exe direto** (recomendado AGORA):
- https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/download/v0.2.27/GestorInteligenteDeDemandas-Setup-0.2.27.exe

**Auto-update**: o app vai detectar v0.2.27 automaticamente. Mas se o auto-update não funcionou (como aconteceu na sua v0.2.25 → v0.2.26), o Setup.exe é a saída garantida.

## Compatibilidade

- v0.1.4 do plugin WP não muda
- App Android não muda
- Banco SQLite preservado
- Configurações preservadas
- Sessão do sync preservada (se token ainda válido)

## Testes

17/17 verde. Fix é puramente encoding, nenhuma lógica mudou.

## Mudanças nos arquivos (28)

| Categoria | Arquivos | Substituições |
|---|---|---|
| Front | app.js, configuracoes.js, tarefas.js, inbox.js, busca.js, hoje.js, areas.js, clientes.js, projetos.js, _chrome.js, stubs.js, app.css, index.html | ~150 |
| Backend | servidor.js, permissoes.js, db.js, ulid.js, ambiente.js, core/*.js | ~250 |
| Total | 28 arquivos | 405 |
