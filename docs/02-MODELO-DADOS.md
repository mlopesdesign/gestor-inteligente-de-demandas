# 02 — Modelo de Dados (DDL SQLite + Migrações)

> **Vinculante.** Precedência #1 (documento da Fase 1).
> Sem código de produto. Define o schema físico das tabelas, índices, triggers e migrações Flyway.
> Engine: **SQLite 3.50+** via **Xerial JDBC 3.50+** (ADR 0003).
> Banco local: **`gestor_local.db`** em `%APPDATA%/GestorInteligenteDeDemandas/`.
> Banco central: **`gestor_central.db`** em `data/` no servidor.

---

## 1. Convenção de migrations (Flyway)

- Pasta: `server/src/main/resources/db/migration/`.
- Formato: `V<n>__<descrição>.sql` (Flyway community).
- Cada migration é **imutável** após publicada.
- Cada migration é testada sobre **banco no formato da migration anterior** (princípio 12 do AGENTS).
- `flyway_schema_history` mantém controle automático.

## 2. Pragmas obrigatórios (aplicados em toda conexão)

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
PRAGMA cache_size = -20000;
```

Aplicados em `app.mllopes.gestor.db.Pragmas.aplicar(Connection)` antes de qualquer query.

## 3. Migrations

### 3.1 `V1__init.sql` — schema completo da primeira release

```sql
-- =====================================================================
-- V1__init.sql — Gestor Inteligente de Demandas
-- Schema inicial: identidade, tarefas, projetos, sync, auditoria
-- =====================================================================

-- 3.1.1 Identidade --------------------------------------------------------

CREATE TABLE usuarios (
  id                  TEXT PRIMARY KEY,
  email               TEXT NOT NULL UNIQUE COLLATE NOCASE,
  senha_hash          TEXT NOT NULL,
  nome                TEXT NOT NULL,
  fuso                TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  horario_trab_inicio TEXT NOT NULL DEFAULT '08:00',
  horario_trab_fim    TEXT NOT NULL DEFAULT '18:00',
  dias_trabalho_json  TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
  tom_cobranca        TEXT NOT NULL DEFAULT 'PROFISSIONAL'
                      CHECK (tom_cobranca IN ('PROFISSIONAL','FIRME','GENTIL')),
  ia_habilitada       INTEGER NOT NULL DEFAULT 1,
  conta_apagada_em    TEXT,
  criado_em           TEXT NOT NULL,
  atualizado_em       TEXT NOT NULL,
  versao              INTEGER NOT NULL DEFAULT 1,
  cliente_origem      TEXT,
  dono_id             TEXT NOT NULL
);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_dono ON usuarios(dono_id);

CREATE TABLE sessoes (
  id              TEXT PRIMARY KEY,
  usuario_id      TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,
  criada_em       TEXT NOT NULL,
  expira_em       TEXT NOT NULL,
  revogada_em     TEXT,
  dispositivo_id  TEXT,
  ip_criacao      TEXT,
  user_agent      TEXT
);
CREATE INDEX idx_sessoes_usuario ON sessoes(usuario_id);
CREATE INDEX idx_sessoes_token ON sessoes(token_hash);
CREATE INDEX idx_sessoes_expira ON sessoes(expira_em);

CREATE TABLE dispositivos (
  id                TEXT PRIMARY KEY,
  usuario_id        TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  sistema           TEXT NOT NULL,
  app_versao        TEXT NOT NULL,
  ultimo_acesso_em  TEXT NOT NULL,
  criado_em         TEXT NOT NULL,
  revogado_em       TEXT,
  versao            INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_dispositivos_usuario ON dispositivos(usuario_id);

-- 3.1.2 Áreas, clientes, projetos ----------------------------------------

CREATE TABLE areas (
  id          TEXT PRIMARY KEY,
  usuario_id  TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  dono_id     TEXT NOT NULL,
  nome        TEXT NOT NULL,
  cor         TEXT NOT NULL DEFAULT '#888888',
  ordem       INTEGER NOT NULL DEFAULT 0,
  criado_em   TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  versao      INTEGER NOT NULL DEFAULT 1,
  UNIQUE(usuario_id, lower(nome))
);
CREATE INDEX idx_areas_usuario ON areas(usuario_id);

CREATE TABLE clientes (
  id              TEXT PRIMARY KEY,
  usuario_id      TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  dono_id         TEXT NOT NULL,
  nome            TEXT NOT NULL,
  organizacao     TEXT,
  contatos_json   TEXT NOT NULL DEFAULT '{}',
  observacoes     TEXT,
  status          TEXT NOT NULL DEFAULT 'ATIVO'
                  CHECK (status IN ('ATIVO','INATIVO','ARQUIVADO')),
  criado_em       TEXT NOT NULL,
  atualizado_em   TEXT NOT NULL,
  versao          INTEGER NOT NULL DEFAULT 1,
  CHECK (length(trim(nome)) > 0 OR length(trim(coalesce(organizacao,''))) > 0)
);
CREATE INDEX idx_clientes_usuario ON clientes(usuario_id);
CREATE INDEX idx_clientes_status ON clientes(usuario_id, status);

CREATE TABLE projetos (
  id                  TEXT PRIMARY KEY,
  usuario_id          TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  dono_id             TEXT NOT NULL,
  titulo              TEXT NOT NULL,
  descricao           TEXT,
  cliente_id          TEXT REFERENCES clientes(id) ON DELETE SET NULL,
  area_id             TEXT REFERENCES areas(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'PLANEJADO'
                      CHECK (status IN ('PLANEJADO','EM_ANDAMENTO','PAUSADO',
                                        'CONCLUIDO','CANCELADO','ARQUIVADO')),
  prioridade          TEXT NOT NULL DEFAULT 'NORMAL'
                      CHECK (prioridade IN ('BAIXA','NORMAL','ALTA','URGENTE','CRITICA')),
  inicio_em           TEXT,
  fim_em              TEXT,
  progresso_calc      REAL NOT NULL DEFAULT 0.0
                      CHECK (progresso_calc >= 0.0 AND progresso_calc <= 1.0),
  participantes_json  TEXT NOT NULL DEFAULT '[]',
  criado_em           TEXT NOT NULL,
  atualizado_em       TEXT NOT NULL,
  versao              INTEGER NOT NULL DEFAULT 1,
  CHECK (inicio_em IS NULL OR fim_em IS NULL OR fim_em >= inicio_em)
);
CREATE INDEX idx_projetos_usuario ON projetos(usuario_id);
CREATE INDEX idx_projetos_cliente ON projetos(cliente_id);
CREATE INDEX idx_projetos_area ON projetos(area_id);
CREATE INDEX idx_projetos_status ON projetos(usuario_id, status);

-- 3.1.3 Tarefas (núcleo) -------------------------------------------------

CREATE TABLE tarefas (
  id                        TEXT PRIMARY KEY,
  usuario_id                TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  dono_id                   TEXT NOT NULL,
  titulo                    TEXT NOT NULL,
  descricao                 TEXT,
  area_id                   TEXT REFERENCES areas(id) ON DELETE SET NULL,
  projeto_id                TEXT REFERENCES projetos(id) ON DELETE SET NULL,
  cliente_id                TEXT REFERENCES clientes(id) ON DELETE SET NULL,
  status                    TEXT NOT NULL DEFAULT 'CAIXA_ENTRADA'
                            CHECK (status IN ('CAIXA_ENTRADA','PLANEJADA','EM_ANDAMENTO',
                                              'AGUARDANDO_TERCEIRO','BLOQUEADA','EM_REVISAO',
                                              'ENTREGUE_AGUARDANDO_CONFIRMACAO','CONCLUIDA',
                                              'ADIADA','CANCELADA','ARQUIVADA')),
  prioridade                TEXT NOT NULL DEFAULT 'NORMAL'
                            CHECK (prioridade IN ('BAIXA','NORMAL','ALTA','URGENTE','CRITICA')),
  nivel_cobranca            TEXT NOT NULL DEFAULT 'PERSISTENTE'
                            CHECK (nivel_cobranca IN ('DISCRETA','PERSISTENTE','INTENSIVA','CRITICA')),
  inicio_em                 TEXT,
  vencimento_em             TEXT,
  duracao_estimada_min      INTEGER,
  duracao_realizada_min     INTEGER NOT NULL DEFAULT 0,
  recorrencia_json          TEXT,
  etiquetas_json            TEXT NOT NULL DEFAULT '[]',
  responsavel               TEXT,
  origem                    TEXT NOT NULL DEFAULT 'MANUAL'
                            CHECK (origem IN ('MANUAL','NL','IMPORTADA','EMAIL','OUTRO')),
  concluida_em              TEXT,
  entregue_em               TEXT,
  confirmada_em             TEXT,
  motivo_cancelamento       TEXT,
  motivo_adiamento          TEXT,
  criado_em                 TEXT NOT NULL,
  atualizado_em             TEXT NOT NULL,
  versao                    INTEGER NOT NULL DEFAULT 1,
  cliente_origem            TEXT,
  -- Invariantes --
  CHECK (length(trim(titulo)) > 0 AND length(titulo) <= 200),
  CHECK (inicio_em IS NULL OR vencimento_em IS NULL OR vencimento_em >= inicio_em),
  CHECK (criado_em <= atualizado_em),
  CHECK (duracao_realizada_min >= 0),
  CHECK (duracao_estimada_min IS NULL OR duracao_estimada_min > 0),
  CHECK (status != 'CONCLUIDA' OR concluida_em IS NOT NULL),
  CHECK (status != 'ENTREGUE_AGUARDANDO_CONFIRMACAO' OR entregue_em IS NOT NULL),
  CHECK (status != 'CANCELADA' OR (motivo_cancelamento IS NOT NULL AND length(trim(motivo_cancelamento)) > 0)),
  CHECK (recorrencia_json IS NULL OR projeto_id IS NULL)
);
CREATE INDEX idx_tarefas_usuario ON tarefas(usuario_id);
CREATE INDEX idx_tarefas_status ON tarefas(usuario_id, status);
CREATE INDEX idx_tarefas_projeto ON tarefas(projeto_id);
CREATE INDEX idx_tarefas_area ON tarefas(area_id);
CREATE INDEX idx_tarefas_cliente ON tarefas(cliente_id);
CREATE INDEX idx_tarefas_vencimento ON tarefas(vencimento_em) WHERE status NOT IN ('CONCLUIDA','CANCELADA','ARQUIVADA');
CREATE INDEX idx_tarefas_prioridade ON tarefas(usuario_id, prioridade);
CREATE INDEX idx_tarefas_atualizado ON tarefas(atualizado_em);

-- 3.1.4 Subtarefas e dependências ----------------------------------------

CREATE TABLE subtarefas (
  id            TEXT PRIMARY KEY,
  tarefa_id     TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  usuario_id    TEXT NOT NULL,
  dono_id       TEXT NOT NULL,
  titulo        TEXT NOT NULL,
  ordem         INTEGER NOT NULL,
  concluida_em  TEXT,
  criado_em     TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  versao        INTEGER NOT NULL DEFAULT 1,
  UNIQUE(tarefa_id, ordem)
);
CREATE INDEX idx_subtarefas_tarefa ON subtarefas(tarefa_id, ordem);

CREATE TABLE dependencias (
  tarefa_id     TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  depende_de_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL DEFAULT 'BLOQUEIA'
                CHECK (tipo IN ('BLOQUEIA','INFORMA')),
  PRIMARY KEY (tarefa_id, depende_de_id),
  CHECK (tarefa_id != depende_de_id)
);
CREATE INDEX idx_dependencias_depende ON dependencias(depende_de_id);

CREATE TABLE recorrencias_ocorrencias (
  tarefa_pai_id   TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  tarefa_filho_id TEXT NOT NULL UNIQUE REFERENCES tarefas(id) ON DELETE CASCADE,
  data_referencia TEXT NOT NULL
);
CREATE INDEX idx_recorrencias_pai ON recorrencias_ocorrencias(tarefa_pai_id);

-- 3.1.5 Anexos e lembretes -----------------------------------------------

CREATE TABLE anexos (
  id            TEXT PRIMARY KEY,
  tarefa_id     TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  usuario_id    TEXT NOT NULL,
  dono_id       TEXT NOT NULL,
  caminho_local TEXT,
  url_externa   TEXT,
  mime          TEXT NOT NULL,
  tamanho_bytes INTEGER NOT NULL,
  sha256        TEXT NOT NULL,
  criado_em     TEXT NOT NULL,
  versao        INTEGER NOT NULL DEFAULT 1,
  CHECK ((caminho_local IS NOT NULL) != (url_externa IS NOT NULL))  -- XOR
);
CREATE INDEX idx_anexos_tarefa ON anexos(tarefa_id);

CREATE TABLE lembretes (
  id                TEXT PRIMARY KEY,
  tarefa_id         TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  usuario_id        TEXT NOT NULL,
  dono_id           TEXT NOT NULL,
  momento           TEXT NOT NULL,
  canal             TEXT NOT NULL
                    CHECK (canal IN ('WINDOWS_LOCAL','EMAIL','TELEGRAM','WHATSAPP','WEB_PUSH')),
  recorrencia_json   TEXT,
  estado            TEXT NOT NULL DEFAULT 'PENDENTE'
                    CHECK (estado IN ('PENDENTE','ENFILEIRADO','ENTREGUE','CONFIRMADO','FALHOU','CANCELADO')),
  tentativas        INTEGER NOT NULL DEFAULT 0,
  ultimo_erro       TEXT,
  criado_em         TEXT NOT NULL,
  versao            INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_lembretes_tarefa ON lembretes(tarefa_id);
CREATE INDEX idx_lembretes_momento ON lembretes(momento) WHERE estado = 'PENDENTE';
CREATE INDEX idx_lembretes_usuario ON lembretes(usuario_id, estado);

-- 3.1.6 Cobrança por usuário ---------------------------------------------

CREATE TABLE cobranca_config (
  usuario_id        TEXT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  silenciar_fora_horario INTEGER NOT NULL DEFAULT 1,
  politicas_json    TEXT NOT NULL,
  versao            INTEGER NOT NULL DEFAULT 1
);

-- 3.1.7 Auditoria (append-only) -------------------------------------------

CREATE TABLE auditoria (
  id              TEXT PRIMARY KEY,
  usuario_id      TEXT NOT NULL,
  entidade        TEXT NOT NULL,
  entidade_id     TEXT NOT NULL,
  acao            TEXT NOT NULL,
  diff_json       TEXT,
  dispositivo_id  TEXT,
  em              TEXT NOT NULL
);
CREATE INDEX idx_auditoria_usuario_em ON auditoria(usuario_id, em);
CREATE INDEX idx_auditoria_entidade ON auditoria(entidade, entidade_id);

-- 3.1.8 Telemetria de IA (Fase 6) ----------------------------------------

CREATE TABLE ia_telemetria (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id    TEXT NOT NULL,
  rota          TEXT NOT NULL,
  prompt_versao TEXT NOT NULL,
  modelo        TEXT NOT NULL,
  tokens_in     INTEGER,
  tokens_out    INTEGER,
  custo_usd     REAL,
  latencia_ms   INTEGER,
  status        TEXT NOT NULL,
  erro          TEXT,
  criado_em     TEXT NOT NULL
);
CREATE INDEX idx_ia_telemetria_usuario ON ia_telemetria(usuario_id, criado_em);

-- 3.1.9 Sync — apenas no banco local ------------------------------------

CREATE TABLE sync_fila (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  op            TEXT NOT NULL CHECK (op IN ('upsert','delete')),
  tabela        TEXT NOT NULL,
  registro_id   TEXT NOT NULL,
  versao        INTEGER NOT NULL,
  payload_json  TEXT NOT NULL,
  criado_em     TEXT NOT NULL,
  tentativas    INTEGER NOT NULL DEFAULT 0,
  ultimo_erro   TEXT
);
CREATE INDEX idx_sync_fila_criado ON sync_fila(criado_em);
CREATE INDEX idx_sync_fila_tabela ON sync_fila(tabela, registro_id);

CREATE TABLE sync_cursors (
  dispositivo_id TEXT NOT NULL,
  tabela         TEXT NOT NULL,
  versao         INTEGER NOT NULL DEFAULT 0,
  atualizado_em  TEXT NOT NULL,
  PRIMARY KEY (dispositivo_id, tabela)
);

-- 3.1.10 Fila de notificações locais (cliente) ---------------------------

CREATE TABLE fila_notificacoes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  lembrete_id     TEXT NOT NULL,
  tarefa_id       TEXT NOT NULL,
  nivel           TEXT NOT NULL,
  titulo          TEXT NOT NULL,
  corpo           TEXT NOT NULL,
  botoes_json     TEXT NOT NULL,
  programada_para TEXT NOT NULL,
  entregue_em     TEXT,
  visualizada_em  TEXT,
  tentativas      INTEGER NOT NULL DEFAULT 0,
  ultimo_erro     TEXT
);
CREATE INDEX idx_fila_notif_programada ON fila_notificacoes(programada_para) WHERE entregue_em IS NULL;

-- 3.1.11 Tombstones (deleção concorrente) -------------------------------

CREATE TABLE tombstones (
  registro_id   TEXT NOT NULL,
  tabela        TEXT NOT NULL,
  criado_em     TEXT NOT NULL,
  expira_em     TEXT NOT NULL,
  PRIMARY KEY (tabela, registro_id)
);
CREATE INDEX idx_tombstones_expira ON tombstones(expira_em);

-- 3.1.12 Conta-apagada (LGPD) -------------------------------------------

CREATE TABLE conta_apagada (
  usuario_id        TEXT PRIMARY KEY,
  solicitada_em     TEXT NOT NULL,
  hard_delete_em    TEXT  -- quando o cron de limpeza apaga definitivamente
);
```

## 4. Triggers de invariante

```sql
-- Bloqueia DELETE em auditoria (append-only)
CREATE TRIGGER trg_auditoria_no_delete
BEFORE DELETE ON auditoria
BEGIN
  SELECT RAISE(ABORT, 'auditoria: append-only');
END;
CREATE TRIGGER trg_auditoria_no_update
BEFORE UPDATE ON auditoria
BEGIN
  SELECT RAISE(ABORT, 'auditoria: append-only');
END;

-- Auto-atualiza atualizado_em em UPDATE de tarefas
CREATE TRIGGER trg_tarefas_touch
BEFORE UPDATE ON tarefas
FOR EACH ROW
WHEN OLD.atualizado_em = NEW.atualizado_em
BEGIN
  UPDATE tarefas SET atualizado_em = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = NEW.id;
END;

-- Mesmo para projetos
CREATE TRIGGER trg_projetos_touch
BEFORE UPDATE ON projetos
FOR EACH ROW
WHEN OLD.atualizado_em = NEW.atualizado_em
BEGIN
  UPDATE projetos SET atualizado_em = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = NEW.id;
END;

-- Tombstone em DELETE de tarefa (soft delete concorrente)
CREATE TRIGGER trg_tarefas_tombstone
AFTER DELETE ON tarefas
FOR EACH ROW
BEGIN
  INSERT OR REPLACE INTO tombstones(registro_id, tabela, criado_em, expira_em)
  VALUES (OLD.id, 'tarefas', strftime('%Y-%m-%dT%H:%M:%fZ','now'),
          strftime('%Y-%m-%dT%H:%M:%fZ','now','+30 days'));
END;
```

## 5. Convenções

- **Datas**: `TEXT` em ISO 8601 UTC (`2026-08-14T19:00:00.000Z`).
- **IDs**: `TEXT` ULID de 26 chars.
- **Booleanos**: `INTEGER` 0/1.
- **Enums**: `TEXT` com `CHECK`.
- **JSON**: `TEXT` com `json_extract()` para queries.
- **Multi-tenant**: toda tabela replicada tem `dono_id` (preparação arquitetural §5.2 do PROJETO).
- **`versao INTEGER`**: incrementada em todo update; controle de LWW.
- **`cliente_origem`**: ULID do dispositivo que originou a mudança.
- **Soft-delete**: tarefas vão para `ARQUIVADA` (não DELETE físico, exceto via tombstone concorrente).

## 6. Índices (resumo e justificativa)

| Índice | Justificativa |
|---|---|
| `usuarios(email)` UNIQUE | Login |
| `sessoes(token_hash)` UNIQUE | Validação de cookie |
| `sessoes(expira_em)` | Cron de limpeza |
| `tarefas(usuario_id, status)` | Listagem padrão da tela Tarefas |
| `tarefas(vencimento_em)` parcial | Painel "Hoje" e "Atrasadas" |
| `tarefas(usuario_id, prioridade)` | Filtros |
| `tarefas(atualizado_em)` | Sync pull ordenado |
| `subtarefas(tarefa_id, ordem)` | Renderização do checklist |
| `dependencias(depende_de_id)` | Detecção de ciclo reverso |
| `anexos(tarefa_id)` | Listagem |
| `lembretes(momento)` parcial | Scheduler "próximos" |
| `auditoria(usuario_id, em)` | Relatórios e timeline |
| `sync_fila(criado_em)` | FIFO de envio |
| `sync_fila(tabela, registro_id)` | Dedup |
| `tombstones(expira_em)` | Limpeza |
| `fila_notificacoes(programada_para)` parcial | Scheduler de notificações |

## 7. Cenários de migração testados

Cada migration é testada por `tests/db/MigracaoTest.java` que:

1. Carrega snapshot do banco na versão `n-1` (dump binário versionado em `tests/db/snapshots/`).
2. Roda `Flyway.migrate()` para `n`.
3. Compara contagens de linhas das tabelas essenciais.
4. Roda suite de invariantes.
5. Falha CI se qualquer assertiva falhar.

## 8. Diferenças local vs central

| Item | Local (cliente) | Central (servidor) |
|---|---|---|
| `usuarios`, `sessoes`, `dispositivos` | parcial (cache do próprio) | sim (autoritativo) |
| `sync_fila`, `sync_cursors`, `fila_notificacoes`, `tombstones` | sim | não |
| Demais tabelas | sim (cache para offline) | sim (autoritativo) |
| `flyway_schema_history` | não (sync inicial) | sim |
| `ia_telemetria` | não | sim |
| `conta_apagada` | não | sim |

No cliente, a tabela `flyway_schema_history` não existe; o cliente **sempre** parte do estado que veio do servidor (sync inicial) ou de um dump local. Mudanças de schema chegam via atualização de binário + reset do banco local (se incompatível) ou migração escrita em Java local (padrão `LocalMigrator`).

## 9. Cross-references

- Domínio: `01-MODELO-DOMINIO.md`.
- API: `03-CONTRATOS-API.md`.
- Sync: `04-POLITICA-SYNC.md`.
- ADR 0003 (banco Xerial SQLite JDBC).

---

*ML Lopes Design · Marcio · mlopesdesign@gmail.com*
*Fase 1 — Especificação e arquitetura — 14/08/2026.*
