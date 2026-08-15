// tests/test-cobrancas.mjs — motor de cobrança contínua
import { criarDbTeste, SESSAO } from './setup.mjs';

let total = 0, passou = 0;
function t(nome, fn) {
  total++;
  try { fn(); passou++; console.log(`  ✓ ${nome}`); }
  catch (e) { console.log(`  ✗ ${nome}\n    ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function assertEq(a, b, msg) { if (a !== b) throw new Error(`${msg || 'esperado ' + b + ', obtido ' + a}`); }

console.log('test-cobrancas:');

t('intervalo por nivel', () => {
  return import('../src/js/backend/core/cobrancas.js').then(({ intervaloSegundos }) => {
    assertEq(intervaloSegundos('DISCRETA'), 86400);
    assertEq(intervaloSegundos('PERSISTENTE'), 14400);
    assertEq(intervaloSegundos('INTENSIVA'), 3600);
    assertEq(intervaloSegundos('CRITICA'), 900);
  });
});

t('horas bloqueio por prioridade', () => {
  return import('../src/js/backend/core/cobrancas.js').then(({ horasAteBloqueio }) => {
    assertEq(horasAteBloqueio('CRITICA'), 12);
    assertEq(horasAteBloqueio('URGENTE'), 24);
    assertEq(horasAteBloqueio('NORMAL'), 72);
  });
});

t('tarefa concluida nao notifica', () => {
  return import('../src/js/backend/core/cobrancas.js').then(({ avaliar }) => {
    const d = avaliar({
      status: 'CONCLUIDA', prioridade: 'NORMAL', nivelCobranca: 'PERSISTENTE',
      vencimentoEm: '2020-01-01T00:00:00Z', ultimaCobrancaEm: null, agora: '2026-01-01T00:00:00Z',
      fuso: 'America/Sao_Paulo', horaInicio: 8, horaFim: 18, silenciarForaHorario: false,
    });
    assertEq(d.notificar, false);
  });
});

t('atraso 30h escala para INTENSIVA', () => {
  return import('../src/js/backend/core/cobrancas.js').then(({ avaliar }) => {
    const d = avaliar({
      status: 'EM_ANDAMENTO', prioridade: 'NORMAL', nivelCobranca: 'PERSISTENTE',
      vencimentoEm: '2026-01-01T00:00:00Z', ultimaCobrancaEm: null, agora: '2026-01-02T06:00:00Z',
      fuso: 'America/Sao_Paulo', horaInicio: 8, horaFim: 18, silenciarForaHorario: false,
    });
    assertEq(d.nivelAplicado, 'INTENSIVA');
    assertEq(d.notificar, true);
  });
});

t('atraso 80h bloqueia tarefa CRITICA', () => {
  return import('../src/js/backend/core/cobrancas.js').then(({ avaliar }) => {
    const d = avaliar({
      status: 'EM_ANDAMENTO', prioridade: 'URGENTE', nivelCobranca: 'CRITICA',
      vencimentoEm: '2026-01-01T00:00:00Z', ultimaCobrancaEm: null, agora: '2026-01-04T08:00:00Z',
      fuso: 'America/Sao_Paulo', horaInicio: 8, horaFim: 18, silenciarForaHorario: false,
    });
    assertEq(d.bloquear, true);
  });
});

t('tick gera lembrete e bloqueia atrasada', () => {
  return import('../src/js/backend/core/cobrancas.js').then(({ tick }) => {
    const db = criarDbTeste();
    const agora = new Date().toISOString();
    // Tarefa atrasada ha 5 dias
    const venc = new Date(Date.now() - 5*24*3600*1000).toISOString();
    db.exec(
      `INSERT INTO tarefas(id, usuario_id, dono_id, titulo, status, prioridade, nivel_cobranca, vencimento_em, criado_em, atualizado_em, versao) VALUES(?,?,?,?,'EM_ANDAMENTO','NORMAL','PERSISTENTE',?,?,?,1)`,
      ['T01', 'USR01', 'USR01', 'Atrasada', venc, agora, agora]
    );
    const r = tick(db, {}, SESSAO);
    assertEq(r.ok, true);
    assert(r.dados.lembretes_gerados > 0, 'esperava >=1 lembrete');
    assert(r.dados.tarefas_bloqueadas > 0, 'esperava bloqueio');
    const status = db.exec("SELECT status, prioridade, nivel_cobranca FROM tarefas WHERE id = 'T01'");
    assert(status.dados[0].status === 'BLOQUEADA', 'esperava BLOQUEADA, obtido ' + status.dados[0].status);
    assert(status.dados[0].nivel_cobranca === 'CRITICA');
    db.fechar();
  });
});

console.log(`\n${passou}/${total} passou`);
process.exit(passou === total ? 0 : 1);
