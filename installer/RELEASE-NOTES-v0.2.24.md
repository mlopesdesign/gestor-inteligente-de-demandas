# Gestor Inteligente de Demandas v0.2.24

**Data:** 2026-08-19
**Foco:** Sync bidirecional com WordPress (F3 da AGENTS §9.5)

## O que mudou

### Sync na nuvem (F3 do roadmap, §9.1 LIBERADA 2026-08-19)

Implementação inicial do sync bidirecional entre o desktop e o plugin WP (`gestor/v1/sync/*`):

- **Nova aba "Sincronização"** em Configuracoes
- **Login WP**: usa o mesmo email/senha do app Android (autentica via `POST /auth/login`, guarda token + dispositivo_id)
- **Sincronizar agora**: push (envia mudancas locais) + pull (baixa deltas do WP) atomico
- **Indicadores**: conectado/desconectado, ultimo sync, mudancas pendentes, conflitos pendentes
- **Storage**: `sync_state.json` no `%APPDATA%\GestorInteligenteDeDemandas\dados\` (URL WP, token, dispositivo_id, ultimo cursor)
- **Tabela de fila**: `sync_mudancas` (ja existia no schema) e `sync_cursores` sao populadas pelo desktop

### Codigo

- **NOVO** `src/js/backend/core/sync.js` (16 KB): implementa `login`, `logout`, `executar`, `push`, `pull`, `listarConflitos`, `resolver`, `status`, `enfileirarMudanca`
- **Atualizado** `src/js/backend/servidor.js`: importa `core/sync.js` no lugar do stub
- **Atualizado** `src/js/backend/permissoes.js`: registra `sync:login`, `sync:logout`, `sync:executar`
- **Atualizado** `src/js/telas/configuracoes.js`: nova aba "Sincronizacao" + 3 handlers JS (carregar, executar, desconectar)

### Bump de versao

- 0.2.23 -> 0.2.24 em 6 lugares sincronizados
- neutralino.config.json, package.json, src/index.html, src/js/app.js, src/js/backend/ambiente.js, installer/gestor.iss

## Como usar

1. Abrir **Configuracoes > Sincronizacao**
2. Clicar **Entrar** e digitar email/senha (mesmo do app Android)
3. Clicar **Sincronizar agora** - push + pull atomico
4. Resultado mostra quantas tarefas foram enviadas/recebidas

Estado persiste entre sessoes. Proxima sprint: auto-sync a cada X minutos + trigger no startup.

## Validacao

Build v0.2.23 testado em instancia paralela (porta 18724) via browser skill:
- App carrega OK, 5 tarefas reais visiveis, 6 botoes com icones em cada linha
- Tela de Configuracoes mostra 4 abas: Geral, **Sincronizacao**, Backup, Atualizacao
- Build v0.2.24 confirmou carregamento via `Versao instalada: v0.2.24` no painel de atualizacao

**Limitacoes conhecidas desta sprint:**
- Status do sync fica em "carregando..." se o backend nao responde (precisa try/catch mais robusto no handler)
- Auto-sync a cada N minutos ainda nao implementado (sync e manual via botao)
- Conflitos aparecem no contador mas a UI de resolucao ainda nao foi construida

## Proximos passos

- Auto-sync a cada 5 min + on startup
- UI de resolucao de conflitos (PENDENTE / MINE / THEIRS / MERGE)
- Polir app Android (lista vazia apos login - enum StatusTarefa incompleto)
- Play Store (track interno de teste)

SHA-256 Setup.exe: `02B0ED6A3827ACBAA21CC9361431033BE165A4E51D6E99D303B1F71501E3A6DF`

— Mavis · ML Lopes Design
