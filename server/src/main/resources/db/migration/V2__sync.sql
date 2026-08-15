-- =====================================================================
-- V2__sync.sql — Schema de sincronização multi-dispositivo
-- Conforme docs/04-POLITICA-SYNC.md e ADR 0002
-- =====================================================================

-- Mudanças locais feitas em qualquer dispositivo.
-- O servidor enfileira aqui as mudanças aplicadas por push, e o cliente
-- lê em pull para baixar tudo que mudou desde o cursor.
CREATE TABLE IF NOT EXISTS sync_mudancas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id      TEXT NOT NULL,
  dispositivo_id  TEXT NOT NULL,
  tabela          TEXT NOT NULL,
  registro_id     TEXT NOT NULL,
  operacao        TEXT NOT NULL CHECK (operacao IN ('UPSERT','DELETE')),
  versao          INTEGER NOT NULL,
  payload_json    TEXT NOT NULL,        -- estado completo do registro
  criado_em       TEXT NOT NULL,
  aplicada        INTEGER NOT NULL DEFAULT 1,
  UNIQUE(tabela, registro_id, versao)
);
CREATE INDEX IF NOT EXISTS idx_sync_mudancas_usuario_cursor
  ON sync_mudancas(usuario_id, id);
CREATE INDEX IF NOT EXISTS idx_sync_mudancas_registro
  ON sync_mudancas(usuario_id, tabela, registro_id);

-- Cursor por dispositivo: até onde cada cliente já baixou.
CREATE TABLE IF NOT EXISTS sync_cursores (
  usuario_id      TEXT NOT NULL,
  dispositivo_id  TEXT NOT NULL,
  ultimo_id       INTEGER NOT NULL DEFAULT 0,
  atualizado_em   TEXT NOT NULL,
  PRIMARY KEY (usuario_id, dispositivo_id)
);

-- Conflitos: 1 dispositivo A e B editaram o mesmo registro.
-- AGENTS §4.6: conflito é VISÍVEL, sobrescrita nunca é silenciosa.
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
CREATE INDEX IF NOT EXISTS idx_sync_conflitos_usuario
  ON sync_conflitos(usuario_id, estado, criado_em);
CREATE INDEX IF NOT EXISTS idx_sync_conflitos_registro
  ON sync_conflitos(usuario_id, tabela, registro_id);
