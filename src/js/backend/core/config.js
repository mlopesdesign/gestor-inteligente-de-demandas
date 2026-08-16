// src/js/backend/core/config.js — obter, atualizar, exportar, apagar
// Conforme PROJETO §5, §9, LGPD.
import { UlidFactory } from '../ulid.js';
import { auditar } from './auditoria.js';

export function obter(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const u = db.exec(
    `SELECT id, email, nome, fuso, horario_trab_inicio, horario_trab_fim, dias_trabalho_json,
            tom_cobranca, ia_habilitada, criado_em FROM usuarios WHERE id = ?`,
    [sessao.usuario_id]
  );
  if (!u.ok || u.dados.length === 0) return { ok: false, erro: { codigo: 'NAO_ENCONTRADO' } };
  const cobCfg = db.exec(
    `SELECT silenciar_fora_horario, politicas_json FROM cobranca_config WHERE usuario_id = ?`,
    [sessao.usuario_id]
  );
  const stats = db.exec(
    `SELECT
       (SELECT COUNT(*) FROM tarefas WHERE usuario_id = ?) AS total_tarefas,
       (SELECT COUNT(*) FROM tarefas WHERE usuario_id = ? AND status='CONCLUIDA') AS concluidas,
       (SELECT COUNT(*) FROM projetos WHERE usuario_id = ?) AS total_projetos,
       (SELECT COUNT(*) FROM clientes WHERE usuario_id = ?) AS total_clientes,
       (SELECT COUNT(*) FROM areas WHERE usuario_id = ?) AS total_areas,
       (SELECT COUNT(*) FROM auditoria WHERE usuario_id = ?) AS total_auditoria`,
    [sessao.usuario_id, sessao.usuario_id, sessao.usuario_id, sessao.usuario_id, sessao.usuario_id, sessao.usuario_id]
  );
  return {
    ok: true,
    dados: {
      usuario: u.dados[0],
      cobranca: cobCfg.ok && cobCfg.dados[0] ? cobCfg.dados[0] : { silenciar_fora_horario: 1, politicas_json: '{}' },
      stats: stats.ok ? stats.dados[0] : null,
    },
  };
}

export function atualizar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { nome, fuso, horario_trab_inicio, horario_trab_fim, dias_trabalho_json, tom_cobranca, ia_habilitada, silenciar_fora_horario } = payload;
  const sets = []; const vals = [];
  if (nome !== undefined) { sets.push('nome=?'); vals.push(String(nome).trim().slice(0,120)); }
  if (fuso !== undefined) { sets.push('fuso=?'); vals.push(String(fuso).slice(0,60)); }
  if (horario_trab_inicio !== undefined) { sets.push('horario_trab_inicio=?'); vals.push(String(horario_trab_inicio)); }
  if (horario_trab_fim !== undefined) { sets.push('horario_trab_fim=?'); vals.push(String(horario_trab_fim)); }
  if (dias_trabalho_json !== undefined) { sets.push('dias_trabalho_json=?'); vals.push(JSON.stringify(dias_trabalho_json)); }
  if (tom_cobranca !== undefined && ['PROFISSIONAL','FIRME','GENTIL'].includes(tom_cobranca)) { sets.push('tom_cobranca=?'); vals.push(tom_cobranca); }
  if (ia_habilitada !== undefined) { sets.push('ia_habilitada=?'); vals.push(ia_habilitada ? 1 : 0); }
  if (sets.length > 0) {
    sets.push('atualizado_em=?'); vals.push(new Date().toISOString());
    vals.push(sessao.usuario_id);
    const r = db.exec(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`, vals);
    if (!r.ok) return r;
  }
  if (silenciar_fora_horario !== undefined) {
    const ck = db.exec(`SELECT usuario_id FROM cobranca_config WHERE usuario_id = ?`, [sessao.usuario_id]);
    if (ck.ok && ck.dados.length > 0) {
      db.exec(`UPDATE cobranca_config SET silenciar_fora_horario = ? WHERE usuario_id = ?`, [silenciar_fora_horario ? 1 : 0, sessao.usuario_id]);
    } else {
      db.exec(`INSERT INTO cobranca_config(usuario_id, silenciar_fora_horario, politicas_json, versao) VALUES(?,?, '{}', 1)`, [sessao.usuario_id, silenciar_fora_horario ? 1 : 0]);
    }
  }
  return obter(db, {}, sessao);
}

export function exportar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const tabelas = ['usuarios','areas','clientes','projetos','tarefas','recorrencias_ocorrencias','lembretes','cobranca_config','auditoria'];
  const out = { exportado_em: new Date().toISOString(), versao_export: '1.0', dados: {} };
  for (const t of tabelas) {
    const r = db.exec(`SELECT * FROM ${t} WHERE usuario_id = ?`, [sessao.usuario_id]);
    if (r.ok) out.dados[t] = r.dados;
  }
  return { ok: true, dados: out };
}

export function apagar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  // Apaga a conta (LGPD): usuario, sessoes, dispositivos, dados. Mantem auditoria
  // do ato de apagar (registro minimo de conformidade).
  const agora = new Date().toISOString();
  // Marca conta como apagada (soft delete) e remove dados
  const tabelas = ['lembretes','recorrencias_ocorrencias','tarefas','projetos','clientes','areas','cobranca_config','sessoes','dispositivos'];
  for (const t of tabelas) {
    try { db.exec(`DELETE FROM ${t} WHERE usuario_id = ?`, [sessao.usuario_id]); } catch (_) {}
  }
  // Auditoria: insere registro de "conta_apagada" e depois apaga o usuario
  try {
    db.exec(
      `INSERT INTO conta_apagada(id, usuario_id, email, nome, apagada_em, motivo, versao) VALUES(?,?,?,?,?,?,1)`,
      [UlidFactory.next(), sessao.usuario_id, sessao.email || '', sessao.nome || '', agora, payload?.motivo || 'usuario solicitou']
    );
  } catch (_) {}
  // Apaga o usuario
  db.exec(`DELETE FROM usuarios WHERE id = ?`, [sessao.usuario_id]);
  return { ok: true, dados: { apagada_em: agora } };
}
