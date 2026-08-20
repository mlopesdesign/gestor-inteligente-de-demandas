// src/js/backend/core/areas.js — CRUD de Areas (Trabalho, Pessoal, etc)
// Conforme PROJETO §7.2.
import { UlidFactory } from '../ulid.js';
import { auditar } from './auditoria.js';

export function listar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const r = db.exec(
    `SELECT a.id, a.nome, a.cor, a.criado_em, a.atualizado_em, a.versao,
            (SELECT COUNT(*) FROM tarefas t WHERE t.area_id = a.id AND t.status NOT IN ('CONCLUIDA','CANCELADA','ARQUIVADA')) AS tarefas_ativas
     FROM areas a WHERE a.usuario_id = ? ORDER BY a.nome`,
    [sessao.usuario_id]
  );
  if (!r.ok) return r;
  return { ok: true, dados: r.dados };
}

export function criar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { nome, cor } = payload;
  if (!nome || !String(nome).trim()) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'nome obrigatorio' } };
  const id = UlidFactory.next();
  const agora = new Date().toISOString();
  const r = db.exec(
    `INSERT INTO areas(id, usuario_id, dono_id, nome, cor, criado_em, atualizado_em, versao) VALUES(?,?,?,?,?,?,?,1)`,
    [id, sessao.usuario_id, sessao.usuario_id, String(nome).trim().slice(0,60), cor || '#888888', agora, agora]
  );
  if (!r.ok) return r;
  auditar(db, sessao, 'areas', id, 'criada', { nome, cor });
  return { ok: true, dados: { id, nome, cor, criado_em: agora } };
}

export function atualizar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id, versao, nome, cor } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  const r = db.exec(
    `UPDATE areas SET nome=COALESCE(?,nome), cor=COALESCE(?,cor), atualizado_em=?, versao=versao+1 WHERE id=? AND usuario_id=? AND versão=?`,
    [nome ? String(nome).trim() : null, cor || null, new Date().toISOString(), id, sessao.usuario_id, versao || 0]
  );
  if (!r.ok) return r;
  if (r.dados.changes === 0) return { ok: false, erro: { codigo: 'CONFLITO_VERSAO', mensagem: 'area nao encontrada ou versao desatualizada' } };
  auditar(db, sessao, 'areas', id, 'atualizada', { nome, cor });
  return { ok: true, dados: { id } };
}

export function excluir(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  // Bloqueia se ha tarefas vinculadas
  const uso = db.exec(`SELECT COUNT(*) as c FROM tarefas WHERE area_id = ? AND usuario_id = ?`, [id, sessao.usuario_id]);
  if (uso.ok && uso.dados[0]?.c > 0) {
    return { ok: false, erro: { codigo: 'EM_USO', mensagem: 'area possui ' + uso.dados[0].c + ' tarefa(s) vinculada(s). Reatribua antes de excluir.' } };
  }
  const r = db.exec(`DELETE FROM areas WHERE id = ? AND usuario_id = ?`, [id, sessao.usuario_id]);
  if (!r.ok) return r;
  auditar(db, sessao, 'areas', id, 'excluida', {});
  return { ok: true, dados: { id } };
}
