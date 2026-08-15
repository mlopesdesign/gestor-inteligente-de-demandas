// src/js/backend/core/cobrancas.js — escalonamento de cobrança (DISCRETA/PERSISTENTE/INTENSIVA/CRITICA)
// Conforme PROJETO §9 + AGENTS §4.5 ("cobrança continua ate decisao explicita").
// Função pura de avaliacao + tick que aplica decisoes.

import { UlidFactory } from '../ulid.js';
import { auditar } from './auditoria.js';

export function intervaloSegundos(nivel) {
  return ({
    DISCRETA:    86400,
    PERSISTENTE: 14400,
    INTENSIVA:   3600,
    CRITICA:     900,
  })[nivel] ?? 14400;
}

export function horasAteBloqueio(prioridade) {
  return ({
    BAIXA:   168,
    NORMAL:  72,
    ALTA:    48,
    URGENTE: 24,
    CRITICA: 12,
  })[prioridade] ?? 72;
}

// Avalia uma tarefa e decide a proxima acao de cobranca
export function avaliar({ status, prioridade, nivelCobranca, vencimentoEm, ultimaCobrancaEm, agora, fuso, horaInicio, horaFim, silenciarForaHorario }) {
  if (!status) return { notificar: false, motivo: 'status nulo' };
  if (['CONCLUIDA','CANCELADA','ARQUIVADA'].includes(status)) {
    return { notificar: false, motivo: 'resolvida' };
  }
  if (!vencimentoEm) return { notificar: false, motivo: 'sem vencimento' };
  const atrasoMs = new Date(vencimentoEm) - new Date(agora);
  const horasAtraso = Math.max(0, Math.floor(-atrasoMs / 3600000));

  let nivel = nivelCobranca || 'PERSISTENTE';
  let prio  = prioridade || 'NORMAL';
  let motivo = `nivel ${nivel} aplicado a ${horasAtraso}h de atraso`;

  if (horasAtraso >= 72) { nivel = 'CRITICA'; motivo = 'atraso >= 72h: nivel CRITICA'; }
  else if (horasAtraso >= 24 && nivel !== 'CRITICA') { nivel = 'INTENSIVA'; motivo = 'atraso >= 24h: nivel INTENSIVA'; }

  if (horasAtraso >= 168) prio = 'CRITICA';
  else if (horasAtraso >= 72 && !['URGENTE','CRITICA'].includes(prio)) prio = 'URGENTE';

  const bloquear = nivel === 'CRITICA' && horasAtraso >= horasAteBloqueio(prio);

  let notificar = false;
  if (!ultimaCobrancaEm) { notificar = true; motivo += ' | primeira'; }
  else {
    const seg = Math.floor((new Date(agora) - new Date(ultimaCobrancaEm)) / 1000);
    if (seg >= intervaloSegundos(nivel)) { notificar = true; motivo += ` | intervalo ${seg}s`; }
  }

  if (notificar && silenciarForaHorario) {
    const hora = new Date(agora).toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: fuso || 'America/Sao_Paulo' });
    const h = Number(hora);
    if (h < horaInicio || h >= horaFim) { notificar = false; motivo += ` | silenciado fora (${h}h)`; }
  }

  return { notificar, proximaCobrancaEmSegundos: intervaloSegundos(nivel), nivelAplicado: nivel, prioridadeAplicada: prio, bloquear, motivo };
}

export function pendentes(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const r = db.exec(
    `SELECT id, status, prioridade, nivel_cobranca, vencimento_em FROM tarefas
     WHERE usuario_id = ? AND status NOT IN ('CONCLUIDA','CANCELADA','ARQUIVADA')
     ORDER BY (vencimento_em IS NULL), vencimento_em ASC LIMIT 100`,
    [sessao.usuario_id]
  );
  if (!r.ok) return r;
  const agora = new Date().toISOString();
  const out = r.dados.map(t => {
    let horasAtraso = 0;
    if (t.vencimento_em) {
      const d = new Date(t.vencimento_em) - new Date(agora);
      if (d < 0) horasAtraso = Math.floor(-d / 3600000);
    }
    return { ...t, horas_atraso: horasAtraso, proxima_cobranca_em_segundos: intervaloSegundos(t.nivel_cobranca), horas_ate_bloqueio: horasAteBloqueio(t.prioridade) };
  });
  return { ok: true, dados: out };
}

// Tick: percorre todas as tarefas ativas e aplica decisoes
export function tick(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  // Carrega config de cobranca do usuario
  let silenciar = true;
  let horaInicio = 8, horaFim = 18;
  const cfg = db.exec('SELECT silenciar_fora_horario, politicas_json FROM cobranca_config WHERE usuario_id = ?', [sessao.usuario_id]);
  if (cfg.ok && cfg.dados.length > 0) silenciar = cfg.dados[0].silenciar_fora_horario !== 0;
  const usr = db.exec('SELECT fuso, horario_trab_inicio, horario_trab_fim FROM usuarios WHERE id = ?', [sessao.usuario_id]);
  if (usr.ok && usr.dados.length > 0) {
    horaInicio = Number((usr.dados[0].horario_trab_inicio || '08:00').split(':')[0]) || 8;
    horaFim = Number((usr.dados[0].horario_trab_fim || '18:00').split(':')[0]) || 18;
  }

  const tarefas = db.exec(
    `SELECT * FROM tarefas WHERE usuario_id = ? AND status NOT IN ('CONCLUIDA','CANCELADA','ARQUIVADA')`,
    [sessao.usuario_id]
  );
  if (!tarefas.ok) return tarefas;

  let lembretesGerados = 0, bloqueadas = 0, escaladas = 0;
  const agora = new Date().toISOString();
  for (const t of tarefas.dados) {
    const ultima = db.exec(
      `SELECT criado_em FROM lembretes WHERE tarefa_id = ? AND canal = 'WINDOWS_LOCAL' ORDER BY criado_em DESC LIMIT 1`,
      [t.id]
    );
    const ultimaCobranca = (ultima.ok && ultima.dados.length > 0) ? ultima.dados[0].criado_em : null;

    const d = avaliar({
      status: t.status, prioridade: t.prioridade, nivelCobranca: t.nivel_cobranca,
      vencimentoEm: t.vencimento_em, ultimaCobrancaEm: ultimaCobranca, agora,
      fuso: usr.ok && usr.dados[0] ? usr.dados[0].fuso : 'America/Sao_Paulo',
      horaInicio, horaFim, silenciarForaHorario: silenciar,
    });

    if (d.bloquear && t.status !== 'BLOQUEADA') {
      db.exec(`UPDATE tarefas SET status='BLOQUEADA', atualizado_em=?, versao=versao+1 WHERE id=?`, [agora, t.id]);
      auditar(db, sessao, 'tarefas', t.id, 'status_alterado:BLOQUEADA', { motivo: 'cobranca_critica' });
      bloqueadas++;
    }
    if (d.prioridadeAplicada !== t.prioridade) {
      db.exec(`UPDATE tarefas SET prioridade=?, atualizado_em=?, versao=versao+1 WHERE id=?`, [d.prioridadeAplicada, agora, t.id]);
      escaladas++;
    }
    if (d.nivelAplicado !== t.nivel_cobranca) {
      db.exec(`UPDATE tarefas SET nivel_cobranca=?, atualizado_em=?, versao=versao+1 WHERE id=?`, [d.nivelAplicado, agora, t.id]);
      escaladas++;
    }
    if (d.notificar) {
      const lid = UlidFactory.next();
      db.exec(
        `INSERT INTO lembretes(id, tarefa_id, usuario_id, dono_id, momento, canal, estado, tentativas, criado_em, versao) VALUES(?,?,?,?,?,'WINDOWS_LOCAL','PENDENTE',0,?,1)`,
        [lid, t.id, sessao.usuario_id, sessao.usuario_id, agora, agora]
      );
      auditar(db, sessao, 'tarefas', t.id, 'lembrete_gerado', { nivel: d.nivelAplicado, motivo: d.motivo });
      lembretesGerados++;
    }
  }
  return { ok: true, dados: { lembretes_gerados: lembretesGerados, tarefas_bloqueadas: bloqueadas, escalonamentos: escaladas } };
}

export function config(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const r = db.exec('SELECT silenciar_fora_horario, politicas_json FROM cobranca_config WHERE usuario_id = ?', [sessao.usuario_id]);
  let silenciar = 1, politicas = '{}';
  if (r.ok && r.dados.length > 0) { silenciar = r.dados[0].silenciar_fora_horario; politicas = r.dados[0].politicas_json; }
  const usr = db.exec('SELECT horario_trab_inicio, horario_trab_fim FROM usuarios WHERE id = ?', [sessao.usuario_id]);
  return {
    ok: true,
    dados: {
      silenciar_fora_horario: silenciar !== 0,
      politicas: politicas,
      horario_inicio: usr.ok && usr.dados.length > 0 ? Number(usr.dados[0].horario_trab_inicio.split(':')[0]) : 8,
      horario_fim: usr.ok && usr.dados.length > 0 ? Number(usr.dados[0].horario_trab_fim.split(':')[0]) : 18,
    },
  };
}
