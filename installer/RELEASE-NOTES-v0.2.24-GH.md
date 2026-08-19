# v0.2.24 - SYNC: Desktop bidirecional com WordPress

**Data:** 2026-08-19
**Foco:** F3 do roadmap AGENTS.md §9.5 (sync bidirecional) — §9.1 LIBERADA 2026-08-19

## Sync na nuvem

Implementacao inicial do sync bidirecional entre o desktop e o plugin WP (`gestor/v1/sync/*`):

- Nova aba "Sincronizacao" em Configuracoes
- Login WP com email/senha (mesmo do app Android)
- "Sincronizar agora" faz push + pull atomico
- Indicadores: conectado, ultimo sync, mudancas pendentes, conflitos
- Storage: `sync_state.json` em `%APPDATA%\GestorInteligenteDeDemandas\dados\`

## Codigo

- **NOVO** `src/js/backend/core/sync.js` (16 KB): login, logout, executar, push, pull, status, listarConflitos, resolver, enfileirarMudanca
- `servidor.js` importa o novo `core/sync.js` (substitui stub)
- `permissoes.js` registra `sync:login`, `sync:logout`, `sync:executar`
- `configuracoes.js` tem 4 abas (Geral, Sincronizacao, Backup, Atualizacao) + 3 handlers JS

## Bump

0.2.23 -> 0.2.24 em 6 lugares sincronizados (neutralino.config.json, package.json, index.html, app.js, ambiente.js, gestor.iss).

## Como usar

Configuracoes > Sincronizacao > Entrar (email/senha) > Sincronizar agora.

## Validacao

- Build v0.2.24 OK, app carrega com 5 tarefas reais do Marcio
- Tela de Configuracoes mostra 4 abas corretamente
- "Versao instalada: v0.2.24" no painel de atualizacao

**Limitacoes desta sprint:**
- Status do sync fica em "carregando..." se o backend demora
- Auto-sync a cada N minutos ainda nao implementado (sync manual)
- UI de resolucao de conflitos ainda nao construida (conflitos sao contados mas nao listados)

## Proximos passos

- Auto-sync (5 min + on startup)
- UI de resolucao de conflitos (PENDENTE/MINE/THEIRS/MERGE)
- Polir app Android (enum StatusTarefa incompleto)
- Play Store (track interno)

SHA-256 Setup.exe: `02B0ED6A3827ACBAA21CC9361431033BE165A4E51D6E99D303B1F71501E3A6DF`

— Mavis · ML Lopes Design
