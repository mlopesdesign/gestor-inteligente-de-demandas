// src/js/backend/core/clientes.js — CRUD de Clientes/Contatos
// Conforme PROJETO §7.3.
import { UlidFactory } from '../ulid.js';
import { auditar } from './auditoria.js';

export function listar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const busca = (payload?.busca || '').trim();
  // FIX v0.2.10: schema novo: clientes tem `status` ('ATIVO'/'INATIVO'/'ARQUIVADO'),
  // `contatos_json` (texto JSON com {email, telefone, ...}) em vez de colunas email/telefone/arquivado_em.
  let sql = `SELECT c.id, c.nome, c.organizacao, c.contatos_json, c.observacoes, c.status, c.criado_em, c.atualizado_em, c.versão,
                    (SELECT COUNT(*) FROM tarefas t WHERE t.cliente_id = c.id AND t.status NOT IN ('CONCLUIDA','CANCELADA','ARQUIVADA')) AS tarefas_ativas,
                    (SELECT COUNT(*) FROM projetos p WHERE p.cliente_id = c.id AND p.status <> 'ARQUIVADO') AS projetos_ativos,
                    CASE WHEN c.status = 'ARQUIVADO' THEN 1 ELSE 0 END AS arquivado
             FROM clientes c WHERE c.usuario_id = ?`;
  const params = [sessao.usuario_id];
  if (busca) {
    sql += ` AND (c.nome LIKE ? OR c.organizacao LIKE ? OR c.contatos_json LIKE ?)`;
    params.push('%' + busca + '%', '%' + busca + '%', '%' + busca + '%');
  }
  sql += ` ORDER BY CASE WHEN c.status = 'ARQUIVADO' THEN 1 ELSE 0 END, c.nome`;
  const r = db.exec(sql, params);
  if (!r.ok) return r;
  // Mapear contatos_json em campos email/telefone pra UI
  for (const row of r.dados) {
    row.arquivado = !!row.arquivado;
    try {
      const c = JSON.parse(row.contatos_json || '{}');
      row.email = c.email || '';
      row.telefone = c.telefone || '';
    } catch (_) { row.email = ''; row.telefone = ''; }
  }
  return { ok: true, dados: r.dados };
}

export function obter(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  const r = db.exec(
    `SELECT c.*, CASE WHEN c.status = 'ARQUIVADO' THEN 1 ELSE 0 END AS arquivado
     FROM clientes c WHERE c.id = ? AND c.usuario_id = ?`,
    [id, sessao.usuario_id]
  );
  if (!r.ok) return r;
  if (r.dados.length === 0) return { ok: false, erro: { codigo: 'NAO_ENCONTRADO' } };
  const row = r.dados[0];
  row.arquivado = !!row.arquivado;
  try {
    const c = JSON.parse(row.contatos_json || '{}');
    row.email = c.email || '';
    row.telefone = c.telefone || '';
  } catch (_) { row.email = ''; row.telefone = ''; }
  return { ok: true, dados: row };
}

export function criar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { nome, organizacao, email, telefone, observacoes, status } = payload;
  if (!nome || !String(nome).trim()) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'nome obrigatorio' } };
  const id = UlidFactory.next();
  const agora = new Date().toISOString();
  // FIX v0.2.10: schema novo. contatos_json armazena email/telefone.
  const contatos = JSON.stringify({
    email: email ? String(email).trim().slice(0,160) : '',
    telefone: telefone ? String(telefone).trim().slice(0,40) : '',
  });
  const r = db.exec(
    `INSERT INTO clientes(id, usuario_id, dono_id, nome, organizacao, contatos_json, observacoes, status, criado_em, atualizado_em, versão) VALUES(?,?,?,?,?,?,?,?,?,?,1)`,
    [id, sessao.usuario_id, sessao.usuario_id, String(nome).trim().slice(0,120),
     organizacao ? String(organizacao).trim().slice(0,120) : null,
     contatos,
     observacoes ? String(observacoes).trim().slice(0,2000) : null,
     status || 'ATIVO',
     agora, agora]
  );
  if (!r.ok) return r;
  auditar(db, sessao, 'clientes', id, 'criado', { nome });
  return { ok: true, dados: { id, nome, criado_em: agora } };
}

export function atualizar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id, versão, nome, organizacao, email, telefone, observacoes, status } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  const sets = [];
  const vals = [];
  if (nome !== undefined) { sets.push('nome=?'); vals.push(String(nome).trim().slice(0,120)); }
  if (organizacao !== undefined) { sets.push('organizacao=?'); vals.push(organizacao ? String(organizacao).trim().slice(0,120) : null); }
  if (observacoes !== undefined) { sets.push('observacoes=?'); vals.push(observacoes ? String(observacoes).trim().slice(0,2000) : null); }
  if (status !== undefined) { sets.push('status=?'); vals.push(status); }
  if (email !== undefined || telefone !== undefined) {
    // precisa ler o JSON atual pra preservar o outro campo
    const atual = db.exec(`SELECT contatos_json FROM clientes WHERE id = ? AND usuario_id = ?`, [id, sessao.usuario_id]);
    let c = {};
    if (atual.ok && atual.dados[0]?.contatos_json) {
      try { c = JSON.parse(atual.dados[0].contatos_json); } catch (_) { c = {}; }
    }
    if (email !== undefined) c.email = email ? String(email).trim().slice(0,160) : '';
    if (telefone !== undefined) c.telefone = telefone ? String(telefone).trim().slice(0,40) : '';
    sets.push('contatos_json=?'); vals.push(JSON.stringify(c));
  }
  if (sets.length === 0) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'nenhum campo para atualizar' } };
  sets.push('atualizado_em=?'); vals.push(new Date().toISOString());
  sets.push('versão=versão+1');
  vals.push(id, sessao.usuario_id, versão || 0);
  const r = db.exec(
    `UPDATE clientes SET ${sets.join(', ')} WHERE id = ? AND usuario_id = ? AND versão = ?`,
    vals
  );
  if (!r.ok) return r;
  if (r.dados.changes === 0) return { ok: false, erro: { codigo: 'CONFLITO_VERSAO', mensagem: 'cliente nao encontrado ou versão desatualizada' } };
  auditar(db, sessao, 'clientes', id, 'atualizado', { campos: sets });
  return { ok: true, dados: { id } };
}

export function arquivar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  // FIX v0.2.10: schema novo usa `status='ARQUIVADO'`
  const r = db.exec(
    `UPDATE clientes SET status = 'ARQUIVADO', atualizado_em = ?, versão = versão + 1 WHERE id = ? AND usuario_id = ?`,
    [new Date().toISOString(), id, sessao.usuario_id]
  );
  if (!r.ok) return r;
  auditar(db, sessao, 'clientes', id, 'arquivado', {});
  return { ok: true, dados: { id } };
}


// FIX v0.2.18: exclusao real do cliente. Bloqueia se há tarefas/projetos vinculados.
export function excluir(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  // Verifica uso em tarefas
  const usoT = db.exec(`SELECT COUNT(*) AS c FROM tarefas WHERE cliente_id=? AND usuario_id=?`, [id, sessao.usuario_id]);
  if (usoT.ok && usoT.dados[0]?.c > 0) {
    return { ok: false, erro: { codigo: 'EM_USO', mensagem: 'cliente possui ' + usoT.dados[0].c + ' tarefa(s) vinculada(s). Reatribua antes de excluir.' } };
  }
  // Verifica uso em projetos
  const usoP = db.exec(`SELECT COUNT(*) AS c FROM projetos WHERE cliente_id=? AND usuario_id=?`, [id, sessao.usuario_id]);
  if (usoP.ok && usoP.dados[0]?.c > 0) {
    return { ok: false, erro: { codigo: 'EM_USO', mensagem: 'cliente possui ' + usoP.dados[0].c + ' projeto(s) vinculado(s). Reatribua antes de excluir.' } };
  }
  const r = db.exec(
    `DELETE FROM clientes WHERE id=? AND usuario_id=?`,
    [id, sessao.usuario_id]
  );
  if (!r.ok) return r;
  if (r.dados.changes === 0) return { ok: false, erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'cliente nao encontrado' } };
  auditar(db, sessao, 'clientes', id, 'excluido', {});
  return { ok: true, dados: { id } };
}
