// src/js/backend/core/recorrencias.js — geracao de ocorrencias de recorrencias
// Conforme PROJETO §9 (cobrança continua).
import { UlidFactory } from '../ulid.js';
import { auditar } from './auditoria.js';

// Tipos: DIARIA, SEMANAL, MENSAL, ANUAL
// tipo_data: data do "primeiro disparo" da recorrencia

function proximaData(dataIso, tipo) {
  const d = new Date(dataIso);
  if (isNaN(d.getTime())) return null;
  if (tipo === 'DIARIA') d.setDate(d.getDate() + 1);
  else if (tipo === 'SEMANAL') d.setDate(d.getDate() + 7);
  else if (tipo === 'MENSAL') d.setMonth(d.getMonth() + 1);
  else if (tipo === 'ANUAL') d.setFullYear(d.getFullYear() + 1);
  else return null;
  return d.toISOString();
}

export function tick(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const agora = new Date().toISOString();
  // Pega recorrencias ativas do usuario (modelo simples: tarefas com recorrencia_tipo != null)
  // Como nao temos tabela recorrencias separada no MVP, usamos o campo da tarefa.
  const recs = db.exec(
    `SELECT id, titulo, recorrencia_tipo, recorrencia_data_base, projeto_id, area_id, cliente_id,
            prioridade, nivel_cobranca, usuario_id, dono_id, descricao
     FROM tarefas
     WHERE usuario_id = ? AND recorrencia_tipo IS NOT NULL AND recorrencia_tipo != ''
       AND status = 'CONCLUIDA' AND recorrencia_data_base IS NOT NULL`,
    [sessao.usuario_id]
  );
  if (!recs.ok) return recs;
  let geradas = 0;
  for (const r of recs.dados) {
    // Verifica se ja tem ocorrencia futura para essa recorrencia
    // (heuristica: nao duplicar se ja existe tarefa com mesmo titulo e data >= hoje)
    const prox = proximaData(r.recorrencia_data_base, r.recorrencia_tipo);
    if (!prox) continue;
    // Cria nova tarefa
    const novoId = UlidFactory.next();
    const r2 = db.exec(
      `INSERT INTO tarefas(id, usuario_id, dono_id, titulo, descricao, status, prioridade, nivel_cobranca, area_id, projeto_id, cliente_id, recorrencia_tipo, recorrencia_data_base, criado_em, atualizado_em, versão) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
      [novoId, r.usuario_id, r.dono_id, r.titulo, r.descricao, 'PLANEJADA', r.prioridade, r.nivel_cobranca, r.area_id, r.projeto_id, r.cliente_id, r.recorrencia_tipo, prox, agora, agora]
    );
    if (r2.ok) {
      geradas++;
      auditar(db, sessao, 'tarefas', novoId, 'gerada_de_recorrencia', { origem: r.id, tipo: r.recorrencia_tipo });
    }
  }
  return { ok: true, dados: { ocorrencias_geradas: geradas } };
}
