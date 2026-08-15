// src/js/backend/core/areas.js — CRUD de areas
// Funcoes puras. Recebem db como primeiro parametro (PADRAO §3.2).

import { UlidFactory } from '../ulid.js';
import { auditar } from './auditoria.js';

export function listar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const r = db.exec('SELECT * FROM areas WHERE usuario_id = ? ORDER BY ordem, nome', [sessao.usuario_id]);
  return r.ok ? { ok: true, dados: r.dados } : { ok: false, erro: { codigo: 'INTERNO', mensagem: r.erro } };
}

export function criar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  if (!payload.nome || !String(payload.nome).trim()) {
    return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'nome obrigatório' } };
  }
  const id = UlidFactory.next();
  const agora = new Date().toISOString();
  const r = db.exec(
    'INSERT INTO areas(id, usuario_id, dono_id, nome, cor, ordem, criado_em, atualizado_em, versao) VALUES(?,?,?,?,?,?,?,?,1)',
    [id, sessao.usuario_id, sessao.usuario_id, String(payload.nome).trim(), payload.cor || '#888888', payload.ordem || 0, agora, agora]
  );
  if (!r.ok) return { ok: false, erro: { codigo: 'INTERNO', mensagem: r.erro } };
  auditar(db, sessao, 'areas', id, 'criada', null, { nome: payload.nome });
  return { ok: true, dados: { id } };
}

export function atualizar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  if (!payload.id) return { ok: false, erro: { codigo: 'VALIDACAO' } };
  const cols = ['nome', 'cor', 'ordem'];
  const sets = []; const vals = [];
  for (const c of cols) if (c in payload) { sets.push(`${c} = ?`); vals.push(payload[c]); }
  if (sets.length === 0) return { ok: false, erro: { codigo: 'VALIDACAO' } };
  sets.push('atualizado_em = ?', 'versao = versao + 1');
  vals.push(new Date().toISOString(), payload.id, sessao.usuario_id);
  const r = db.exec(`UPDATE areas SET ${sets.join(', ')} WHERE id = ? AND usuario_id = ?`, vals);
  if (!r.ok) return { ok: false, erro: { codigo: 'INTERNO', mensagem: r.erro } };
  if (r.dados.changes === 0) return { ok: false, erro: { codigo: 'NAO_ENCONTRADO' } };
  return { ok: true, dados: { id: payload.id } };
}

export function excluir(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  if (!payload.id) return { ok: false, erro: { codigo: 'VALIDACAO' } };
  const r = db.exec('DELETE FROM areas WHERE id = ? AND usuario_id = ?', [payload.id, sessao.usuario_id]);
  if (!r.ok) return { ok: false, erro: { codigo: 'INTERNO', mensagem: r.erro } };
  if (r.dados.changes === 0) return { ok: false, erro: { codigo: 'NAO_ENCONTRADO' } };
  auditar(db, sessao, 'areas', payload.id, 'excluida', null);
  return { ok: true, dados: {} };
}
