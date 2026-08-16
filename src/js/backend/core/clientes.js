// src/js/backend/core/clientes.js — CRUD de Clientes/Contatos
// Conforme PROJETO §7.3.
import { UlidFactory } from '../ulid.js';
import { auditar } from './auditoria.js';

export function listar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const busca = (payload?.busca || '').trim();
  let sql = `SELECT c.id, c.nome, c.organizacao, c.email, c.telefone, c.observacoes, c.arquivado_em, c.criado_em, c.atualizado_em, c.versao,
                    (SELECT COUNT(*) FROM tarefas t WHERE t.cliente_id = c.id AND t.status NOT IN ('CONCLUIDA','CANCELADA','ARQUIVADA')) AS tarefas_ativas,
                    (SELECT COUNT(*) FROM projetos p WHERE p.cliente_id = c.id AND p.arquivado_em IS NULL) AS projetos_ativos
             FROM clientes c WHERE c.usuario_id = ?`;
  const params = [sessao.usuario_id];
  if (busca) {
    sql += ` AND (c.nome LIKE ? OR c.organizacao LIKE ? OR c.email LIKE ?)`;
    params.push('%' + busca + '%', '%' + busca + '%', '%' + busca + '%');
  }
  sql += ` ORDER BY c.arquivado_em IS NOT NULL, c.nome`;
  const r = db.exec(sql, params);
  if (!r.ok) return r;
  return { ok: true, dados: r.dados };
}

export function obter(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  const r = db.exec(
    `SELECT c.* FROM clientes c WHERE c.id = ? AND c.usuario_id = ?`,
    [id, sessao.usuario_id]
  );
  if (!r.ok) return r;
  if (r.dados.length === 0) return { ok: false, erro: { codigo: 'NAO_ENCONTRADO' } };
  return { ok: true, dados: r.dados[0] };
}

export function criar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { nome, organizacao, email, telefone, observacoes } = payload;
  if (!nome || !String(nome).trim()) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'nome obrigatorio' } };
  const id = UlidFactory.next();
  const agora = new Date().toISOString();
  const r = db.exec(
    `INSERT INTO clientes(id, usuario_id, dono_id, nome, organizacao, email, telefone, observacoes, criado_em, atualizado_em, versao) VALUES(?,?,?,?,?,?,?,?,?,?,1)`,
    [id, sessao.usuario_id, sessao.usuario_id, String(nome).trim().slice(0,120),
     organizacao ? String(organizacao).trim().slice(0,120) : null,
     email ? String(email).trim().slice(0,160) : null,
     telefone ? String(telefone).trim().slice(0,40) : null,
     observacoes ? String(observacoes).trim().slice(0,2000) : null,
     agora, agora]
  );
  if (!r.ok) return r;
  auditar(db, sessao, 'clientes', id, 'criado', { nome });
  return { ok: true, dados: { id, nome, criado_em: agora } };
}

export function atualizar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id, versao, nome, organizacao, email, telefone, observacoes } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  const sets = [];
  const vals = [];
  if (nome !== undefined) { sets.push('nome=?'); vals.push(String(nome).trim().slice(0,120)); }
  if (organizacao !== undefined) { sets.push('organizacao=?'); vals.push(organizacao ? String(organizacao).trim().slice(0,120) : null); }
  if (email !== undefined) { sets.push('email=?'); vals.push(email ? String(email).trim().slice(0,160) : null); }
  if (telefone !== undefined) { sets.push('telefone=?'); vals.push(telefone ? String(telefone).trim().slice(0,40) : null); }
  if (observacoes !== undefined) { sets.push('observacoes=?'); vals.push(observacoes ? String(observacoes).trim().slice(0,2000) : null); }
  if (sets.length === 0) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'nenhum campo para atualizar' } };
  sets.push('atualizado_em=?'); vals.push(new Date().toISOString());
  sets.push('versao=versao+1');
  vals.push(id, sessao.usuario_id, versao || 0);
  const r = db.exec(
    `UPDATE clientes SET ${sets.join(', ')} WHERE id = ? AND usuario_id = ? AND versao = ?`,
    vals
  );
  if (!r.ok) return r;
  if (r.dados.changes === 0) return { ok: false, erro: { codigo: 'CONFLITO_VERSAO', mensagem: 'cliente nao encontrado ou versao desatualizada' } };
  auditar(db, sessao, 'clientes', id, 'atualizado', { campos: sets });
  return { ok: true, dados: { id } };
}

export function arquivar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  const r = db.exec(
    `UPDATE clientes SET arquivado_em = ?, atualizado_em = ?, versao = versao + 1 WHERE id = ? AND usuario_id = ?`,
    [new Date().toISOString(), new Date().toISOString(), id, sessao.usuario_id]
  );
  if (!r.ok) return r;
  auditar(db, sessao, 'clientes', id, 'arquivado', {});
  return { ok: true, dados: { id } };
}
