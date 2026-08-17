// src/js/backend/core/tarefas.js — CRUD completo de Tarefas
// Conforme PROJETO §7.5.
import { UlidFactory } from '../ulid.js';
import { auditar } from './auditoria.js';

const STATUS_VALIDOS = ['CAIXA_ENTRADA','PLANEJADA','EM_ANDAMENTO','AGUARDANDO_TERCEIRO','EM_REVISAO','BLOQUEADA','CONCLUIDA','CANCELADA','ARQUIVADA','ADIADA'];
const PRIORIDADE_VALIDAS = ['BAIXA','NORMAL','ALTA','URGENTE','CRITICA'];
const NIVEIS = ['DISCRETA','PERSISTENTE','INTENSIVA','CRITICA'];

export function listar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { status, area_id, projeto_id, cliente_id, vencidas, busca, incluir_arquivadas, limite } = payload || {};
  const lim = Math.min(Number(limite) || 200, 1000);
  let sql = `SELECT t.id, t.titulo, t.descricao, t.status, t.prioridade, t.nivel_cobranca, t.area_id, t.projeto_id, t.cliente_id,
                    t.inicio_em, t.vencimento_em, t.concluida_em, t.motivo_cancelamento, t.motivo_adiamento,
                    t.cancelada_em, t.cancelada_motivo, t.adiada_ate, t.adiada_motivo,
                    t.recorrencia_tipo, t.versao, t.atualizado_em, t.criado_em,
                    a.nome AS area_nome, a.cor AS area_cor,
                    p.titulo AS projeto_titulo,
                    c.nome AS cliente_nome
             FROM tarefas t
             LEFT JOIN areas a ON a.id = t.area_id
             LEFT JOIN projetos p ON p.id = t.projeto_id
             LEFT JOIN clientes c ON c.id = t.cliente_id
             WHERE t.usuario_id = ?`;
  const params = [sessao.usuario_id];
  if (!incluir_arquivadas) {
    sql += ` AND t.status NOT IN ('ARQUIVADA')`;
  }
  if (status) {
    if (Array.isArray(status)) {
      sql += ` AND t.status IN (${status.map(() => '?').join(',')})`;
      params.push(...status);
    } else {
      sql += ' AND t.status = ?';
      params.push(status);
    }
  }
  if (area_id) { sql += ' AND t.area_id = ?'; params.push(area_id); }
  if (projeto_id) { sql += ' AND t.projeto_id = ?'; params.push(projeto_id); }
  if (cliente_id) { sql += ' AND t.cliente_id = ?'; params.push(cliente_id); }
  if (vencidas) { sql += " AND t.vencimento_em IS NOT NULL AND t.vencimento_em < ? AND t.status NOT IN ('CONCLUIDA','CANCELADA','ARQUIVADA')"; params.push(new Date().toISOString()); }
  if (busca) { sql += ' AND (t.titulo LIKE ? OR t.descricao LIKE ?)'; params.push('%' + busca + '%', '%' + busca + '%'); }
  sql += ` ORDER BY t.vencimento_em IS NULL, t.vencimento_em ASC, t.prioridade DESC, t.criado_em DESC LIMIT ${lim}`;
  const r = db.exec(sql, params);
  if (!r.ok) return r;
  return { ok: true, dados: r.dados };
}

export function obter(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  const r = db.exec(
    `SELECT t.*, a.nome AS area_nome, a.cor AS area_cor, p.titulo AS projeto_titulo, c.nome AS cliente_nome
     FROM tarefas t LEFT JOIN areas a ON a.id=t.area_id LEFT JOIN projetos p ON p.id=t.projeto_id LEFT JOIN clientes c ON c.id=t.cliente_id
     WHERE t.id = ? AND t.usuario_id = ?`,
    [id, sessao.usuario_id]
  );
  if (!r.ok) return r;
  if (r.dados.length === 0) return { ok: false, erro: { codigo: 'NAO_ENCONTRADO' } };
  // Subtarefas
  const sub = db.exec(`SELECT id, titulo, concluida FROM subtarefas WHERE tarefa_id = ? ORDER BY ordem, criado_em`, [id]);
  return { ok: true, dados: { ...r.dados[0], subtarefas: sub.ok ? sub.dados : [] } };
}

export function criar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { titulo, descricao, area_id, projeto_id, cliente_id, status, prioridade, nivel_cobranca, inicio_em, vencimento_em, recorrencia_tipo, recorrencia_data_base, origem } = payload;
  if (!titulo || !String(titulo).trim()) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'titulo obrigatorio' } };
  const id = UlidFactory.next();
  const agora = new Date().toISOString();
  const st = status || (origem === 'INBOX' ? 'CAIXA_ENTRADA' : 'PLANEJADA');
  const prio = PRIORIDADE_VALIDAS.includes(prioridade) ? prioridade : 'NORMAL';
  const nivel = NIVEIS.includes(nivel_cobranca) ? nivel_cobranca : 'PERSISTENTE';
  const r = db.exec(
    `INSERT INTO tarefas(id, usuario_id, dono_id, titulo, descricao, status, prioridade, nivel_cobranca, area_id, projeto_id, cliente_id, inicio_em, vencimento_em, recorrencia_tipo, recorrencia_data_base, criado_em, atualizado_em, versao) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
    [id, sessao.usuario_id, sessao.usuario_id, String(titulo).trim().slice(0,300),
     descricao ? String(descricao).trim().slice(0,5000) : null,
     STATUS_VALIDOS.includes(st) ? st : 'PLANEJADA',
     prio, nivel,
     area_id || null, projeto_id || null, cliente_id || null,
     inicio_em || null, vencimento_em || null,
     recorrencia_tipo || null, recorrencia_data_base || null,
     agora, agora]
  );
  if (!r.ok) return r;
  auditar(db, sessao, 'tarefas', id, 'criada', { titulo, origem: origem || 'manual' });
  return { ok: true, dados: { id, titulo, criado_em: agora } };
}

export function atualizar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id, versao, ...rest } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  const map = {
    titulo:'titulo', descricao:'descricao', area_id:'area_id', projeto_id:'projeto_id', cliente_id:'cliente_id',
    inicio_em:'inicio_em', vencimento_em:'vencimento_em', recorrencia_tipo:'recorrencia_tipo', recorrencia_data_base:'recorrencia_data_base',
    motivo_cancelamento:'motivo_cancelamento', motivo_adiamento:'motivo_adiamento',
    cancelada_motivo:'cancelada_motivo', adiada_ate:'adiada_ate', adiada_motivo:'adiada_motivo',
  };
  const sets = []; const vals = [];
  for (const k of Object.keys(map)) {
    if (rest[k] !== undefined) { sets.push(`${map[k]}=?`); vals.push(rest[k]); }
  }
  if (rest.status !== undefined) {
    if (STATUS_VALIDOS.includes(rest.status)) { sets.push('status=?'); vals.push(rest.status); }
  }
  if (rest.prioridade !== undefined) {
    if (PRIORIDADE_VALIDAS.includes(rest.prioridade)) { sets.push('prioridade=?'); vals.push(rest.prioridade); }
  }
  if (rest.nivel_cobranca !== undefined) {
    if (NIVEIS.includes(rest.nivel_cobranca)) { sets.push('nivel_cobranca=?'); vals.push(rest.nivel_cobranca); }
  }
  if (sets.length === 0) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'nenhum campo para atualizar' } };
  sets.push('atualizado_em=?', 'versao=versao+1');
  vals.push(new Date().toISOString(), id, sessao.usuario_id, versao || 0);
  const r = db.exec(
    `UPDATE tarefas SET ${sets.join(', ')} WHERE id = ? AND usuario_id = ? AND versao = ?`, vals
  );
  if (!r.ok) return r;
  if (r.dados.changes === 0) return { ok: false, erro: { codigo: 'CONFLITO_VERSAO', mensagem: 'tarefa nao encontrada ou versao desatualizada' } };
  auditar(db, sessao, 'tarefas', id, 'atualizada', { campos: sets });
  return { ok: true, dados: { id } };
}

function _alterarStatus(db, payload, sessao, novoStatus, campos) {
  const { id, versao, motivo } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  const agora = new Date().toISOString();
  const sets = ['status=?', 'atualizado_em=?', 'versao=versao+1'];
  const vals = [novoStatus, agora];
  if (campos.concluida_em) { sets.push('concluida_em=?'); vals.push(agora); }
  if (campos.cancelada_em) { sets.push('cancelada_em=?'); vals.push(agora); }
  if (campos.cancelada_motivo) { sets.push('cancelada_motivo=?'); vals.push(motivo || ''); }
  if (campos.motivo_cancelamento) { sets.push('motivo_cancelamento=?'); vals.push(motivo || ''); }
  if (campos.adiada_ate) { sets.push('adiada_ate=?'); vals.push(payload.adiada_ate || null); }
  if (campos.adiada_motivo) { sets.push('adiada_motivo=?'); vals.push(motivo || ''); }
  if (campos.motivo_adiamento) { sets.push('motivo_adiamento=?'); vals.push(motivo || ''); }
  vals.push(id, sessao.usuario_id, versao || 0);
  const r = db.exec(
    `UPDATE tarefas SET ${sets.join(', ')} WHERE id = ? AND usuario_id = ? AND versao = ?`, vals
  );
  if (!r.ok) return r;
  if (r.dados.changes === 0) return { ok: false, erro: { codigo: 'CONFLITO_VERSAO', mensagem: 'tarefa nao encontrada ou versao desatualizada' } };
  auditar(db, sessao, 'tarefas', id, 'status_alterado:' + novoStatus, { motivo });
  return { ok: true, dados: { id, status: novoStatus } };
}

export function concluir(db, payload, sessao) {
  return _alterarStatus(db, payload, sessao, 'CONCLUIDA', { concluida_em: true });
}

export function cancelar(db, payload, sessao) {
  if (!payload.motivo || !String(payload.motivo).trim()) {
    return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'motivo obrigatorio para cancelar' } };
  }
  return _alterarStatus(db, payload, sessao, 'CANCELADA', { cancelada_em: true, cancelada_motivo: true, motivo_cancelamento: true });
}

export function adiar(db, payload, sessao) {
  if (!payload.vencimento_em) {
    return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'vencimento_em obrigatorio para adiar' } };
  }
  const r1 = db.exec(
    `UPDATE tarefas SET vencimento_em=?, adiada_ate=?, adiada_motivo=?, motivo_adiamento=?, status='ADIADA', atualizado_em=?, versao=versao+1 WHERE id=? AND usuario_id=? AND versao=?`,
    [payload.vencimento_em, payload.vencimento_em, payload.motivo || null, payload.motivo || null, new Date().toISOString(), payload.id, sessao.usuario_id, payload.versao || 0]
  );
  if (!r1.ok) return r1;
  if (r1.dados.changes === 0) return { ok: false, erro: { codigo: 'CONFLITO_VERSAO', mensagem: 'tarefa nao encontrada ou versao desatualizada' } };
  auditar(db, sessao, 'tarefas', payload.id, 'adiada', { ate: payload.vencimento_em, motivo: payload.motivo });
  return { ok: true, dados: { id, status: 'ADIADA' } };
}

export function reabrir(db, payload, sessao) {
  if (!payload.motivo || !String(payload.motivo).trim()) {
    return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'motivo obrigatorio para reabrir' } };
  }
  return _alterarStatus(db, payload, sessao, 'EM_ANDAMENTO', {});
}

export function arquivar(db, payload, sessao) {
  return _alterarStatus(db, payload, sessao, 'ARQUIVADA', {});
}

export function adicionarSubtarefa(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { tarefa_id, titulo } = payload;
  if (!tarefa_id || !titulo) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'tarefa_id e titulo obrigatorios' } };
  const id = UlidFactory.next();
  const r = db.exec(
    `INSERT INTO subtarefas(id, tarefa_id, titulo, concluida, criado_em, versao) VALUES(?,?,?,0,?,1)`,
    [id, tarefa_id, String(titulo).trim().slice(0,300), new Date().toISOString()]
  );
  if (!r.ok) return r;
  return { ok: true, dados: { id, titulo } };
}

export function toggleSubtarefa(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id, concluida } = payload;
  const r = db.exec(
    `UPDATE subtarefas SET concluida=?, versao=versao+1 WHERE id=? AND tarefa_id IN (SELECT id FROM tarefas WHERE usuario_id=?)`,
    [concluida ? 1 : 0, id, sessao.usuario_id]
  );
  if (!r.ok) return r;
  return { ok: true, dados: { id } };
}


// FIX v0.2.18: exclusao real da tarefa (era só "concluir" antes)
export function excluir(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  const r = db.exec(
    `DELETE FROM tarefas WHERE id=? AND usuario_id=?`,
    [id, sessao.usuario_id]
  );
  if (!r.ok) return r;
  if (r.dados.changes === 0) return { ok: false, erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'tarefa nao encontrada' } };
  auditar(db, sessao, 'tarefas', id, 'excluida', {});
  return { ok: true, dados: { id } };
}
