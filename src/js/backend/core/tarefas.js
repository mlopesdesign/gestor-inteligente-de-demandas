// src/js/backend/core/tarefas.js — CRUD + ações (concluir, cancelar, adiar, reabrir)
// Funções puras: recebem db como primeiro parâmetro (PADRAO §3.2).

import { UlidFactory } from '../ulid.js';
import { auditar } from './auditoria.js';

function validarTitulo(t) {
  if (!t || typeof t !== 'string') return false;
  const s = t.trim();
  return s.length > 0 && s.length <= 200;
}

export function listar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'login necessário' } };
  const { status, areaId, projetoId, limite = 200 } = payload;
  let sql = `SELECT * FROM tarefas WHERE usuario_id = ? AND status NOT IN ('ARQUIVADA')`;
  const params = [sessao.usuario_id];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (areaId) { sql += ' AND area_id = ?'; params.push(areaId); }
  if (projetoId) { sql += ' AND projeto_id = ?'; params.push(projetoId); }
  sql += ' ORDER BY atualizado_em DESC LIMIT ?';
  params.push(Number(limite) || 200);
  const r = db.exec(sql, params);
  return r.ok ? { ok: true, dados: r.dados } : { ok: false, erro: { codigo: 'INTERNO', mensagem: r.erro } };
}

export function obter(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'login necessário' } };
  const r = db.exec('SELECT * FROM tarefas WHERE id = ? AND usuario_id = ?', [payload.id, sessao.usuario_id]);
  if (!r.ok || r.dados.length === 0) {
    return { ok: false, erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Tarefa inexistente' } };
  }
  return { ok: true, dados: r.dados[0] };
}

export function criar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'login necessário' } };
  if (!validarTitulo(payload.titulo)) {
    return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'titulo obrigatório (1-200 chars)' } };
  }
  const id = UlidFactory.next();
  const agora = new Date().toISOString();
  const r = db.exec(
    `INSERT INTO tarefas(id, usuario_id, dono_id, titulo, descricao, area_id, projeto_id, cliente_id,
                        status, prioridade, nivel_cobranca, vencimento_em,
                        duracao_estimada_min, recorrencia_json, etiquetas_json, responsavel,
                        origem, criado_em, atualizado_em, versao)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
    [
      id, sessao.usuario_id, sessao.usuario_id,
      String(payload.titulo).trim(),
      payload.descricao ?? null,
      payload.area_id ?? null,
      payload.projeto_id ?? null,
      payload.cliente_id ?? null,
      payload.status ?? 'CAIXA_ENTRADA',
      payload.prioridade ?? 'NORMAL',
      payload.nivel_cobranca ?? 'PERSISTENTE',
      payload.vencimento_em ?? null,
      Number.isFinite(payload.duracao_estimada_min) ? payload.duracao_estimada_min : null,
      payload.recorrencia_json ?? null,
      JSON.stringify(payload.etiquetas ?? []),
      payload.responsavel ?? null,
      payload.origem ?? 'MANUAL',
      agora, agora,
    ]
  );
  if (!r.ok) return { ok: false, erro: { codigo: 'INTERNO', mensagem: r.erro } };
  auditar(db, sessao, 'tarefas', id, 'criada', null, { titulo: payload.titulo });
  return { ok: true, dados: { id, versao: 1, criado_em: agora } };
}

export function atualizar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'login necessário' } };
  const { id, versao, ...campos } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatório' } };
  if (!Number.isInteger(versao) || versao <= 0) {
    return { ok: false, erro: { codigo: 'CONFLITO_VERSAO', mensagem: 'versao obrigatória para atualização otimista' } };
  }
  const cols = ['titulo','descricao','area_id','projeto_id','cliente_id','status','prioridade','nivel_cobranca','vencimento_em','duracao_estimada_min','recorrencia_json','etiquetas_json','responsavel'];
  const sets = [];
  const vals = [];
  for (const c of cols) {
    if (c in campos) {
      sets.push(`${c} = ?`);
      vals.push(c === 'etiquetas_json' ? JSON.stringify(campos[c] ?? []) : campos[c]);
    }
  }
  if (sets.length === 0) {
    return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'nenhum campo para atualizar' } };
  }
  sets.push('atualizado_em = ?', 'versao = versao + 1');
  vals.push(new Date().toISOString());
  vals.push(id, sessao.usuario_id, versao);
  const sql = `UPDATE tarefas SET ${sets.join(', ')} WHERE id = ? AND usuario_id = ? AND versao = ?`;
  const r = db.exec(sql, vals);
  if (!r.ok) return { ok: false, erro: { codigo: 'INTERNO', mensagem: r.erro } };
  if (r.dados.changes === 0) {
    return { ok: false, erro: { codigo: 'CONFLITO_VERSAO', mensagem: 'versão desatualizada' } };
  }
  return obter(db, { id }, sessao);
}

export function concluir(db, payload, sessao) {
  return _alterarStatus(db, payload, sessao, 'CONCLUIDA', 'concluida_em', null);
}

export function cancelar(db, payload, sessao) {
  if (!payload.motivo || !String(payload.motivo).trim()) {
    return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'motivo obrigatório para cancelar' } };
  }
  return _alterarStatus(db, payload, sessao, 'CANCELADA', null, payload.motivo);
}

export function adiar(db, payload, sessao) {
  if (!payload.vencimento_em) {
    return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'vencimento_em obrigatório' } };
  }
  return atualizar(db, {
    id: payload.id,
    versao: payload.versao,
    vencimento_em: payload.vencimento_em,
    status: 'ADIADA',
    ...(payload.motivo ? { /* campo motivo_adiamento nao esta em atualizar; ver nota */ } : {}),
  }, sessao);
}

export function reabrir(db, payload, sessao) {
  if (!payload.motivo || !String(payload.motivo).trim()) {
    return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'motivo obrigatório para reabrir' } };
  }
  return _alterarStatus(db, payload, sessao, 'EM_ANDAMENTO', null, null, { reaberto_motivo: payload.motivo });
}

function _alterarStatus(db, payload, sessao, novoStatus, campoHora, motivo, extra) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'login necessário' } };
  const agora = new Date().toISOString();
  const vals = [novoStatus, agora];
  let sql = 'UPDATE tarefas SET status = ?, atualizado_em = ?, versao = versao + 1';
  if (campoHora) { sql += `, ${campoHora} = ?`; vals.push(agora); }
  if (motivo)    { sql += `, motivo_cancelamento = ?`; vals.push(motivo); }
  sql += ' WHERE id = ? AND usuario_id = ?';
  vals.push(payload.id, sessao.usuario_id);
  const r = db.exec(sql, vals);
  if (!r.ok) return { ok: false, erro: { codigo: 'INTERNO', mensagem: r.erro } };
  if (r.dados.changes === 0) {
    return { ok: false, erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Tarefa inexistente' } };
  }
  auditar(db, sessao, 'tarefas', payload.id, 'status_alterado:' + novoStatus, motivo ? { motivo, ...(extra || {}) } : (extra || null));
  return { ok: true, dados: { novo_status: novoStatus } };
}
