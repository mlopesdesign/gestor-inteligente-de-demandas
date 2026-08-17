-- =====================================================================
-- schema.sql — Gestor Inteligente de Demandas
-- Fonte de verdade do banco. Aplicado via db.js::migrar() no boot.
--
-- Conforme PADRAO-ML-LOPES-DESIGN.md §3.5 + §4 + §11.
-- Identidade imutável: app.mllopes.gestor / GestorInteligenteDeDemandas.
-- Banco: %APPDATA%\GestorInteligenteDeDemandas\dados\gestor.db (sql.js)
-- =====================================================================

-- Identidade ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS usuarios (
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
  ia_consentimento_em TEXT,
  conta_apagada_em    TEXT,
  criado_em           TEXT NOT NULL,
  atualizado_em       TEXT NOT NULL,
  versao              INTEGER NOT NULL DEFAULT 1,
  cliente_origem      TEXT,
  dono_id             TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessoes (
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

CREATE TABLE IF NOT EXISTS dispositivos (
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

-- Áreas, clientes, projetos --------------------------------------------

CREATE TABLE IF NOT EXISTS areas (
  id            TEXT PRIMARY KEY,
  usuario_id    TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  dono_id       TEXT NOT NULL,
  nome          TEXT NOT NULL,
  cor           TEXT NOT NULL DEFAULT '#888888',
  ordem         INTEGER NOT NULL DEFAULT 0,
  criado_em     TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  versao        INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_areas_usuario_nome ON areas(usuario_id, lower(nome));

CREATE TABLE IF NOT EXISTS clientes (
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

CREATE TABLE IF NOT EXISTS projetos (
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

-- Tarefas --------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tarefas (
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
  recorrencia_tipo          TEXT,
  recorrencia_data_base     TEXT,
  etiquetas_json            TEXT NOT NULL DEFAULT '[]',
  responsavel               TEXT,
  origem                    TEXT NOT NULL DEFAULT 'MANUAL'
                            CHECK (origem IN ('MANUAL','NL','IMPORTADA','EMAIL','OUTRO')),
  concluida_em              TEXT,
  entregue_em               TEXT,
  confirmada_em             TEXT,
  motivo_cancelamento       TEXT,
  motivo_adiamento          TEXT,
  cancelada_em              TEXT,
  cancelada_motivo          TEXT,
  adiada_ate                TEXT,
  adiada_motivo             TEXT,
  criado_em                 TEXT NOT NULL,
  atualizado_em             TEXT NOT NULL,
  versao                    INTEGER NOT NULL DEFAULT 1,
  cliente_origem            TEXT,
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
CREATE INDEX IF NOT EXISTS idx_tarefas_usuario ON tarefas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(usuario_id, status);
CREATE INDEX IF NOT EXISTS idx_tarefas_projeto ON tarefas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_area ON tarefas(area_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_cliente ON tarefas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_vencimento ON tarefas(vencimento_em) WHERE status NOT IN ('CONCLUIDA','CANCELADA','ARQUIVADA');
CREATE INDEX IF NOT EXISTS idx_tarefas_prioridade ON tarefas(usuario_id, prioridade);
CREATE INDEX IF NOT EXISTS idx_tarefas_atualizado ON tarefas(atualizado_em);

-- Subtarefas e dependências --------------------------------------------

CREATE TABLE IF NOT EXISTS subtarefas (
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

CREATE TABLE IF NOT EXISTS dependencias (
  tarefa_id     TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  depende_de_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL DEFAULT 'BLOQUEIA'
                CHECK (tipo IN ('BLOQUEIA','INFORMA')),
  PRIMARY KEY (tarefa_id, depende_de_id),
  CHECK (tarefa_id != depende_de_id)
);

CREATE TABLE IF NOT EXISTS recorrencias_ocorrencias (
  tarefa_pai_id   TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  tarefa_filho_id TEXT NOT NULL UNIQUE REFERENCES tarefas(id) ON DELETE CASCADE,
  data_referencia TEXT NOT NULL
);

-- Lembretes (cobrança) --------------------------------------------------

CREATE TABLE IF NOT EXISTS lembretes (
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
CREATE INDEX IF NOT EXISTS idx_lembretes_tarefa ON lembretes(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_momento ON lembretes(momento) WHERE estado = 'PENDENTE';
CREATE INDEX IF NOT EXISTS idx_lembretes_usuario ON lembretes(usuario_id, estado);

-- Cobrança por usuário -------------------------------------------------

CREATE TABLE IF NOT EXISTS cobranca_config (
  usuario_id              TEXT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  silenciar_fora_horario INTEGER NOT NULL DEFAULT 1,
  politicas_json          TEXT NOT NULL,
  versao                  INTEGER NOT NULL DEFAULT 1
);

-- Auditoria (append-only) ----------------------------------------------

CREATE TABLE IF NOT EXISTS auditoria (
  id              TEXT PRIMARY KEY,
  usuario_id      TEXT NOT NULL,
  entidade        TEXT NOT NULL,
  entidade_id     TEXT NOT NULL,
  acao            TEXT NOT NULL,
  diff_json       TEXT,
  dispositivo_id  TEXT,
  em              TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_em ON auditoria(usuario_id, em);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidade ON auditoria(entidade, entidade_id);

-- Telemetria de IA (opcional) ------------------------------------------

CREATE TABLE IF NOT EXISTS ia_telemetria (
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
CREATE INDEX IF NOT EXISTS idx_ia_telemetria_usuario ON ia_telemetria(usuario_id, criado_em);

-- Tombstones (deleção concorrente) -------------------------------------

CREATE TABLE IF NOT EXISTS tombstones (
  registro_id   TEXT NOT NULL,
  tabela        TEXT NOT NULL,
  criado_em     TEXT NOT NULL,
  expira_em     TEXT NOT NULL,
  PRIMARY KEY (tabela, registro_id)
);
CREATE INDEX IF NOT EXISTS idx_tombstones_expira ON tombstones(expira_em);

-- LGPD -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS conta_apagada (
  usuario_id        TEXT PRIMARY KEY,
  solicitada_em     TEXT NOT NULL,
  hard_delete_em    TEXT
);

-- Sync entre dispositivos (fila + conflitos) ---------------------------

CREATE TABLE IF NOT EXISTS sync_mudancas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id      TEXT NOT NULL,
  dispositivo_id  TEXT NOT NULL,
  tabela          TEXT NOT NULL,
  registro_id     TEXT NOT NULL,
  operacao        TEXT NOT NULL CHECK (operacao IN ('UPSERT','DELETE')),
  versao          INTEGER NOT NULL,
  payload_json    TEXT NOT NULL,
  criado_em       TEXT NOT NULL,
  aplicada        INTEGER NOT NULL DEFAULT 1,
  UNIQUE(tabela, registro_id, versao)
);
CREATE INDEX IF NOT EXISTS idx_sync_mudancas_usuario_cursor ON sync_mudancas(usuario_id, id);
CREATE INDEX IF NOT EXISTS idx_sync_mudancas_registro ON sync_mudancas(usuario_id, tabela, registro_id);

CREATE TABLE IF NOT EXISTS sync_cursores (
  usuario_id      TEXT NOT NULL,
  dispositivo_id  TEXT NOT NULL,
  ultimo_id       INTEGER NOT NULL DEFAULT 0,
  atualizado_em   TEXT NOT NULL,
  PRIMARY KEY (usuario_id, dispositivo_id)
);

CREATE TABLE IF NOT EXISTS sync_conflitos (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id          TEXT NOT NULL,
  tabela              TEXT NOT NULL,
  registro_id         TEXT NOT NULL,
  versao_servidor     INTEGER NOT NULL,
  versao_cliente_a    INTEGER NOT NULL,
  dispositivo_a_id    TEXT NOT NULL,
  payload_servidor    TEXT NOT NULL,
  payload_cliente_a   TEXT NOT NULL,
  estado              TEXT NOT NULL DEFAULT 'PENDENTE'
                      CHECK (estado IN ('PENDENTE','RESOLVIDO_MINE','RESOLVIDO_THEIRS','RESOLVIDO_MERGE','CANCELADO')),
  escolhido_por       TEXT,
  escolhido_em        TEXT,
  diff_json           TEXT,
  criado_em           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sync_conflitos_usuario ON sync_conflitos(usuario_id, estado, criado_em);
CREATE INDEX IF NOT EXISTS idx_sync_conflitos_registro ON sync_conflitos(usuario_id, tabela, registro_id);

-- Anexos ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS anexos (
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
  CHECK ((caminho_local IS NOT NULL) != (url_externa IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_anexos_tarefa ON anexos(tarefa_id);

-- Backups ------------------------------------------------------------------
-- Registro de backups (manual e automatico). O arquivo em si fica em
-- %APPDATA%\GestorInteligenteDeDemandas\dados\backups\gestor-YYYYMMDD-HHMMSS.db
CREATE TABLE IF NOT EXISTS backups (
  id              TEXT PRIMARY KEY,
  criado_em       TEXT NOT NULL,
  caminho         TEXT NOT NULL,
  tamanho_bytes   INTEGER NOT NULL,
  origem          TEXT NOT NULL,                 -- 'manual' | 'auto' | 'pre-update'
  observacao      TEXT,                          -- ex: "antes de v0.2.12", "auto diario"
  sha256          TEXT,                          -- integridade (opcional)
  status          TEXT NOT NULL DEFAULT 'ok'     -- 'ok' | 'restaurado' | 'invalido' | 'excluido'
);
CREATE INDEX IF NOT EXISTS idx_backups_criado_em ON backups(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_backups_origem ON backups(origem);

-- Triggers de invariante ------------------------------------------------

CREATE TRIGGER IF NOT EXISTS trg_auditoria_no_delete
BEFORE DELETE ON auditoria
BEGIN
  SELECT RAISE(ABORT, 'auditoria: append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_auditoria_no_update
BEFORE UPDATE ON auditoria
BEGIN
  SELECT RAISE(ABORT, 'auditoria: append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_tarefas_tombstone
AFTER DELETE ON tarefas
FOR EACH ROW
BEGIN
  INSERT OR REPLACE INTO tombstones(registro_id, tabela, criado_em, expira_em)
  VALUES (OLD.id, 'tarefas', strftime('%Y-%m-%dT%H:%M:%fZ','now'),
          strftime('%Y-%m-%dT%H:%M:%fZ','now','+30 days'));
END;
