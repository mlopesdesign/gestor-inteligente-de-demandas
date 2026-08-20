// src/js/backend/core/projetos.js — CRUD de Projetos
// Conforme PROJETO §7.4.
import { UlidFactory } from '../ulid.js';
import { auditar } from './auditoria.js';
import { enfileirarMudanca } from './sync.js';

export function listar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { status, cliente_id, area_id } = payload || {};
  // FIX v0.2.10: schema novo usa `inicio_em`/`fim_em` (sem termino_previsto_em/termino_real_em/arquivado_em)
  // status='ARQUIVADO' substitui arquivado_em
  let sql = `SELECT p.id, p.titulo, p.descricao, p.cliente_id, p.area_id, p.status, p.prioridade,
                    p.inicio_em, p.fim_em, p.progresso_calc, p.participantes_json, p.criado_em, p.atualizado_em, p.versao,
                    c.nome AS cliente_nome, a.nome AS area_nome, a.cor AS area_cor,
                    (SELECT COUNT(*) FROM tarefas t WHERE t.projeto_id = p.id AND t.status NOT IN ('CONCLUIDA','CANCELADA','ARQUIVADA')) AS tarefas_ativas,
                    (SELECT COUNT(*) FROM tarefas t WHERE t.projeto_id = p.id) AS tarefas_total,
                    CASE WHEN p.status = 'ARQUIVADO' THEN 1 ELSE 0 END AS arquivado
             FROM projetos p
             LEFT JOIN clientes c ON c.id = p.cliente_id
             LEFT JOIN areas a ON a.id = p.area_id
             WHERE p.usuario_id = ?`;
  const params = [sessao.usuario_id];
  if (status) { sql += ' AND p.status = ?'; params.push(status); }
  if (cliente_id) { sql += ' AND p.cliente_id = ?'; params.push(cliente_id); }
  if (area_id) { sql += ' AND p.area_id = ?'; params.push(area_id); }
  sql += ' ORDER BY CASE WHEN p.status = \'ARQUIVADO\' THEN 1 ELSE 0 END, p.prioridade DESC, p.fim_em IS NULL, p.fim_em ASC, p.criado_em DESC';
  const r = db.exec(sql, params);
  if (!r.ok) return r;
  // DEBUG: log do que tá sendo filtrado
  try {
    if (typeof window !== 'undefined' && window.__appLog) {
      window.__appLog('[projetos.listar] uid=' + sessao.usuario_id + ' rows=' + r.dados.length + ' sql=' + sql.substring(0, 100));
    }
  } catch (_) {}
  console.log('[projetos.listar] uid=', sessao.usuario_id, 'rows=', r.dados.length);
  // mapear arquivado virtual
  for (const row of r.dados) row.arquivado = !!row.arquivado;
  return { ok: true, dados: r.dados };
}

export function obter(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id } = payload;
  const r = db.exec(
    `SELECT p.*, c.nome AS cliente_nome, a.nome AS area_nome, a.cor AS area_cor,
            CASE WHEN p.status = 'ARQUIVADO' THEN 1 ELSE 0 END AS arquivado
     FROM projetos p LEFT JOIN clientes c ON c.id = p.cliente_id LEFT JOIN areas a ON a.id = p.area_id
     WHERE p.id = ? AND p.usuario_id = ?`,
    [id, sessao.usuario_id]
  );
  if (!r.ok) return r;
  if (r.dados.length === 0) return { ok: false, erro: { codigo: 'NAO_ENCONTRADO' } };
  r.dados[0].arquivado = !!r.dados[0].arquivado;
  return { ok: true, dados: r.dados[0] };
}

export function criar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { titulo, descricao, cliente_id, area_id, status, prioridade, inicio_em, fim_em } = payload;
  if (!titulo || !String(titulo).trim()) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'titulo obrigatorio' } };
  const id = UlidFactory.next();
  const agora = new Date().toISOString();
  // FIX v0.2.10: schema novo usa `inicio_em`/`fim_em` (sem termino_previsto_em/termino_real_em)
  const r = db.exec(
    `INSERT INTO projetos(id, usuario_id, dono_id, titulo, descricao, cliente_id, area_id, status, prioridade, inicio_em, fim_em, criado_em, atualizado_em, versao) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
    [id, sessao.usuario_id, sessao.usuario_id, String(titulo).trim().slice(0,200),
     descricao ? String(descricao).trim().slice(0,2000) : null,
     cliente_id || null, area_id || null,
     status || 'PLANEJADO',
     prioridade || 'NORMAL',
     inicio_em || null, fim_em || null,
     agora, agora]
  );
  if (!r.ok) return r;
  auditar(db, sessao, 'projetos', id, 'criado', { titulo });
  enfileirarMudanca(db, sessao, 'projetos', 'UPSERT', id, 1, { id, titulo, descricao, cliente_id, area_id, status: status || 'PLANEJADO', prioridade: prioridade || 'NORMAL', inicio_em, fim_em, criado_em: agora, atualizado_em: agora, versao: 1 });
  return { ok: true, dados: { id, titulo, criado_em: agora } };
}

export function atualizar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id, versao, titulo, descricao, cliente_id, area_id, status, prioridade, inicio_em, fim_em } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  const sets = []; const vals = [];
  // FIX v0.2.10: schema novo usa `inicio_em`/`fim_em` (sem termino_*)
  const map = { titulo:'titulo', descricao:'descricao', cliente_id:'cliente_id', area_id:'area_id', status:'status', prioridade:'prioridade', inicio_em:'inicio_em', fim_em:'fim_em' };
  for (const k of Object.keys(map)) {
    if (payload[k] !== undefined) { sets.push(`${map[k]}=?`); vals.push(payload[k]); }
  }
  if (sets.length === 0) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'nenhum campo para atualizar' } };
  sets.push('atualizado_em=?', 'versao=versao+1');
  vals.push(new Date().toISOString(), id, sessao.usuario_id, versao || 0);
  const r = db.exec(
    `UPDATE projetos SET ${sets.join(', ')} WHERE id = ? AND usuario_id = ? AND versao = ?`, vals
  );
  if (!r.ok) return r;
  if (r.dados.changes === 0) return { ok: false, erro: { codigo: 'CONFLITO_VERSAO', mensagem: 'projeto nao encontrado ou versao desatualizada' } };
  auditar(db, sessao, 'projetos', id, 'atualizado', { campos: Object.keys(map).filter(k => payload[k] !== undefined) });
  const versaoNova = (Number(versao) || 0) + 1;
  enfileirarMudanca(db, sessao, 'projetos', 'UPSERT', id, versaoNova, { id, ...payload, versao: versaoNova, atualizado_em: new Date().toISOString() });
  return { ok: true, dados: { id } };
}

export function arquivar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  // FIX v0.2.10: schema novo usa `status='ARQUIVADO'` em vez de `arquivado_em`
  const r = db.exec(
    `UPDATE projetos SET status = 'ARQUIVADO', atualizado_em = ?, versao = versao + 1 WHERE id = ? AND usuario_id = ?`,
    [new Date().toISOString(), id, sessao.usuario_id]
  );
  if (!r.ok) return r;
  auditar(db, sessao, 'projetos', id, 'arquivado', {});
  enfileirarMudanca(db, sessao, 'projetos', 'UPSERT', id, 0, { id, status: 'ARQUIVADO', arquivado: 1 });
  return { ok: true, dados: { id } };
}

export function concluir(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id } = payload;
  const agora = new Date().toISOString();
  // FIX v0.2.10: schema novo nao tem `termino_real_em`. Conclui via status.
  const r = db.exec(
    `UPDATE projetos SET status='CONCLUIDO', fim_em=COALESCE(fim_em, ?), atualizado_em=?, versao=versao+1 WHERE id=? AND usuario_id=?`,
    [agora, agora, id, sessao.usuario_id]
  );
  if (!r.ok) return r;
  auditar(db, sessao, 'projetos', id, 'concluido', {});
  enfileirarMudanca(db, sessao, 'projetos', 'UPSERT', id, 0, { id, status: 'CONCLUIDO', fim_em: agora });
  return { ok: true, dados: { id } };
}


// FIX v0.2.18: exclusao real do projeto. Bloqueia se há tarefas vinculadas.
export function excluir(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  const uso = db.exec(`SELECT COUNT(*) AS c FROM tarefas WHERE projeto_id=? AND usuario_id=?`, [id, sessao.usuario_id]);
  if (uso.ok && uso.dados[0]?.c > 0) {
    return { ok: false, erro: { codigo: 'EM_USO', mensagem: 'projeto possui ' + uso.dados[0].c + ' tarefa(s) vinculada(s). Reatribua antes de excluir.' } };
  }
  const r = db.exec(
    `DELETE FROM projetos WHERE id=? AND usuario_id=?`,
    [id, sessao.usuario_id]
  );
  if (!r.ok) return r;
  if (r.dados.changes === 0) return { ok: false, erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'projeto nao encontrado' } };
  auditar(db, sessao, 'projetos', id, 'excluido', {});
  enfileirarMudanca(db, sessao, 'projetos', 'DELETE', id, 0, { id });
  return { ok: true, dados: { id } };
}
