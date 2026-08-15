-- V3 já tem ia_telemetria (do V1).
-- Esta migration só garante índices extras para telemetria.
CREATE INDEX IF NOT EXISTS idx_ia_telemetria_status
  ON ia_telemetria(usuario_id, status, criado_em);
CREATE INDEX IF NOT EXISTS idx_ia_telemetria_rota
  ON ia_telemetria(rota, criado_em);
