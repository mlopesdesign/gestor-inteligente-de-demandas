// src/js/backend/core/auditoria.js — append-only, com trigger de proteção
// (definido no schema.sql). Função pura.

import { UlidFactory } from '../ulid.js';

export function auditar(db, sessao, entidade, entidadeId, acao, diff, extra) {
  const id = UlidFactory.next();
  const agora = new Date().toISOString();
  const diffJson = diff || extra ? JSON.stringify({ ...(diff || {}), ...(extra || {}) }) : null;
  db.exec(
    `INSERT INTO auditoria(id, usuario_id, entidade, entidade_id, acao, diff_json, dispositivo_id, em) VALUES(?,?,?,?,?,?,?,?)`,
    [id, sessao.usuario_id || null, entidade, entidadeId, acao, diffJson, sessao.dispositivo_id || null, agora]
  );
  return id;
}
