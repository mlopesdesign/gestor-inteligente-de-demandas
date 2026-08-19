// tests/test-tarefas.mjs — testes do core de tarefas
import { criarDbTeste, SESSAO } from './setup.mjs';

let total = 0, passou = 0;
function t(nome, fn) {
  total++;
  try {
    fn();
    passou++;
    console.log(`  ✓ ${nome}`);
  } catch (e) {
    console.log(`  ✗ ${nome}\n    ${e.message}`);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'falhou'); }
function assertEq(a, b, msg) { if (a !== b) throw new Error(`${msg || 'esperado ' + b + ', obtido ' + a}`); }

console.log('test-tarefas:');

t('criar tarefa valida devolve id', () => {
  const db = criarDbTeste();
  const r = db.exec("SELECT id FROM tarefas LIMIT 1");
  // Sem tarefas inicialmente
  assert(r.dados.length === 0);
  // Import dinâmico p/ evitar problema de ciclo
  return import('../src/js/backend/core/tarefas.js').then(({ criar, obter }) => {
    const r2 = criar(db, { titulo: 'Teste 1', prioridade: 'ALTA' }, SESSAO);
    assertEq(r2.ok, true);
    assert(r2.dados.id, 'id ausente');
    const r3 = obter(db, { id: r2.dados.id }, SESSAO);
    assertEq(r3.dados.titulo, 'Teste 1');
    assertEq(r3.dados.prioridade, 'ALTA');
    db.fechar();
  });
});

t('criar tarefa sem titulo falha', async () => {
  const db = criarDbTeste();
  const { criar } = await import('../src/js/backend/core/tarefas.js');
  const r = criar(db, { titulo: '' }, SESSAO);
  assertEq(r.ok, false);
  assertEq(r.erro.codigo, 'VALIDACAO');
  db.fechar();
});

t('concluir muda status e registra conclusao_em', async () => {
  const db = criarDbTeste();
  const { criar, concluir, obter } = await import('../src/js/backend/core/tarefas.js');
  const c = criar(db, { titulo: 'X' }, SESSAO);
  const r = concluir(db, { id: c.dados.id }, SESSAO);
  assertEq(r.ok, true);
  const o = obter(db, { id: c.dados.id }, SESSAO);
  assertEq(o.dados.status, 'CONCLUIDA');
  assert(o.dados.concluida_em, 'concluida_em ausente');
  db.fechar();
});

t('cancelar exige motivo', async () => {
  const db = criarDbTeste();
  const { criar, cancelar } = await import('../src/js/backend/core/tarefas.js');
  const c = criar(db, { titulo: 'X' }, SESSAO);
  const r1 = cancelar(db, { id: c.dados.id }, SESSAO);
  assertEq(r1.ok, false);
  assertEq(r1.erro.codigo, 'VALIDACAO');
  const r2 = cancelar(db, { id: c.dados.id, motivo: 'desisti' }, SESSAO);
  assertEq(r2.ok, true);
  db.fechar();
});

t('atualizar exige versao (otimista)', async () => {
  const db = criarDbTeste();
  const { criar, atualizar } = await import('../src/js/backend/core/tarefas.js');
  const c = criar(db, { titulo: 'X' }, SESSAO);
  const r1 = atualizar(db, { id: c.dados.id, titulo: 'Y' }, SESSAO);
  assertEq(r1.ok, false);
  assertEq(r1.erro.codigo, 'CONFLITO_VERSAO');
  const r2 = atualizar(db, { id: c.dados.id, versao: 1, titulo: 'Y' }, SESSAO);
  assertEq(r2.ok, true);
  db.fechar();
});

t('listar filtra por status', async () => {
  const db = criarDbTeste();
  const { criar, listar } = await import('../src/js/backend/core/tarefas.js');
  criar(db, { titulo: 'A' }, SESSAO);
  criar(db, { titulo: 'B', status: 'EM_ANDAMENTO' }, SESSAO);
  const r1 = listar(db, {}, SESSAO);
  assertEq(r1.dados.length, 2);
  const r2 = listar(db, { status: 'CAIXA_ENTRADA' }, SESSAO);
  assertEq(r2.dados.length, 1);
  db.fechar();
});

t('sem sessao nega operacao', async () => {
  const db = criarDbTeste();
  const { listar } = await import('../src/js/backend/core/tarefas.js');
  const r = listar(db, {}, {});
  assertEq(r.ok, false);
  assertEq(r.erro.codigo, 'NAO_AUTENTICADO');
  db.fechar();
});

// v0.2.25: testes de subtarefas (adicionar / toggle / excluir + cascade)

t('subtarefa: adicionar retorna id', async () => {
  const db = criarDbTeste();
  const { criar, adicionarSubtarefa } = await import('../src/js/backend/core/tarefas.js');
  const c = criar(db, { titulo: 'Pai' }, SESSAO);
  const r = adicionarSubtarefa(db, { tarefa_id: c.dados.id, titulo: 'Filha 1' }, SESSAO);
  assertEq(r.ok, true);
  assert(r.dados.id, 'id ausente');
  db.fechar();
});

t('subtarefa: adicionar exige tarefa_id e titulo', async () => {
  const db = criarDbTeste();
  const { adicionarSubtarefa } = await import('../src/js/backend/core/tarefas.js');
  const r1 = adicionarSubtarefa(db, {}, SESSAO);
  assertEq(r1.ok, false);
  assertEq(r1.erro.codigo, 'VALIDACAO');
  const r2 = adicionarSubtarefa(db, { tarefa_id: 'X' }, SESSAO);
  assertEq(r2.ok, false);
  assertEq(r2.erro.codigo, 'VALIDACAO');
  db.fechar();
});

t('subtarefa: obter tarefa retorna lista de subtarefas', async () => {
  const db = criarDbTeste();
  const { criar, adicionarSubtarefa, obter } = await import('../src/js/backend/core/tarefas.js');
  const c = criar(db, { titulo: 'Pai' }, SESSAO);
  adicionarSubtarefa(db, { tarefa_id: c.dados.id, titulo: 'A' }, SESSAO);
  adicionarSubtarefa(db, { tarefa_id: c.dados.id, titulo: 'B' }, SESSAO);
  const o = obter(db, { id: c.dados.id }, SESSAO);
  assertEq(o.ok, true);
  assertEq(o.dados.subtarefas.length, 2);
  assertEq(o.dados.subtarefas[0].titulo, 'A');
  assertEq(o.dados.subtarefas[1].titulo, 'B');
  db.fechar();
});

t('subtarefa: toggle muda concluida', async () => {
  const db = criarDbTeste();
  const { criar, adicionarSubtarefa, toggleSubtarefa, obter } = await import('../src/js/backend/core/tarefas.js');
  const c = criar(db, { titulo: 'Pai' }, SESSAO);
  const s = adicionarSubtarefa(db, { tarefa_id: c.dados.id, titulo: 'Filha' }, SESSAO);
  toggleSubtarefa(db, { id: s.dados.id, concluida: true }, SESSAO);
  const o = obter(db, { id: c.dados.id }, SESSAO);
  assertEq(o.dados.subtarefas[0].concluida, 1);
  toggleSubtarefa(db, { id: s.dados.id, concluida: false }, SESSAO);
  const o2 = obter(db, { id: c.dados.id }, SESSAO);
  assertEq(o2.dados.subtarefas[0].concluida, 0);
  db.fechar();
});

t('subtarefa: excluir remove so a subtarefa alvo', async () => {
  const db = criarDbTeste();
  const { criar, adicionarSubtarefa, excluirSubtarefa, obter } = await import('../src/js/backend/core/tarefas.js');
  const c = criar(db, { titulo: 'Pai' }, SESSAO);
  const s1 = adicionarSubtarefa(db, { tarefa_id: c.dados.id, titulo: 'A' }, SESSAO);
  const s2 = adicionarSubtarefa(db, { tarefa_id: c.dados.id, titulo: 'B' }, SESSAO);
  const r = excluirSubtarefa(db, { id: s1.dados.id }, SESSAO);
  assertEq(r.ok, true);
  const o = obter(db, { id: c.dados.id }, SESSAO);
  assertEq(o.dados.subtarefas.length, 1);
  assertEq(o.dados.subtarefas[0].id, s2.dados.id);
  db.fechar();
});

t('subtarefa: excluir id inexistente retorna NAO_ENCONTRADO', async () => {
  const db = criarDbTeste();
  const { excluirSubtarefa } = await import('../src/js/backend/core/tarefas.js');
  const r = excluirSubtarefa(db, { id: 'INEXISTENTE' }, SESSAO);
  assertEq(r.ok, false);
  assertEq(r.erro.codigo, 'NAO_ENCONTRADO');
  db.fechar();
});

t('subtarefa: exige sessao autenticada', async () => {
  const db = criarDbTeste();
  const { excluirSubtarefa, adicionarSubtarefa, toggleSubtarefa } = await import('../src/js/backend/core/tarefas.js');
  assertEq(adicionarSubtarefa(db, { tarefa_id: 'X', titulo: 'Y' }, {}).erro.codigo, 'NAO_AUTENTICADO');
  assertEq(toggleSubtarefa(db, { id: 'X', concluida: true }, {}).erro.codigo, 'NAO_AUTENTICADO');
  assertEq(excluirSubtarefa(db, { id: 'X' }, {}).erro.codigo, 'NAO_AUTENTICADO');
  db.fechar();
});

t('cascade: excluir tarefa remove suas subtarefas', async () => {
  const db = criarDbTeste();
  const { criar, adicionarSubtarefa, excluir } = await import('../src/js/backend/core/tarefas.js');
  const c = criar(db, { titulo: 'Pai' }, SESSAO);
  adicionarSubtarefa(db, { tarefa_id: c.dados.id, titulo: 'F1' }, SESSAO);
  adicionarSubtarefa(db, { tarefa_id: c.dados.id, titulo: 'F2' }, SESSAO);
  // Confirma que tem 2
  const antes = db.exec('SELECT COUNT(*) AS c FROM subtarefas WHERE tarefa_id = ?', [c.dados.id]);
  assertEq(antes.dados[0].c, 2);
  // Exclui a tarefa
  const r = excluir(db, { id: c.dados.id }, SESSAO);
  assertEq(r.ok, true);
  // Cascade: subtarefas devem ter sumido
  const depois = db.exec('SELECT COUNT(*) AS c FROM subtarefas WHERE tarefa_id = ?', [c.dados.id]);
  assertEq(depois.dados[0].c, 0);
  db.fechar();
});

t('subtarefa: nao pode excluir subtarefa de outro usuario (RLS)', async () => {
  const db = criarDbTeste();
  // Cria um segundo usuario
  db.raw.prepare(
    `INSERT INTO usuarios(id, email, senha_hash, nome, criado_em, atualizado_em, versao, dono_id)
     VALUES('USR02','outro@teste.local','hash','Outro',?,?,1,'USR02')`
  ).run(new Date().toISOString(), new Date().toISOString());
  const s2 = { ...SESSAO, usuario_id: 'USR02', email: 'outro@teste.local' };
  const { criar, adicionarSubtarefa, excluirSubtarefa } = await import('../src/js/backend/core/tarefas.js');
  // Tarefa do USR01
  const c1 = criar(db, { titulo: 'Tarefa do user 1' }, SESSAO);
  const s = adicionarSubtarefa(db, { tarefa_id: c1.dados.id, titulo: 'Sub' }, SESSAO);
  // USR02 tenta excluir
  const r = excluirSubtarefa(db, { id: s.dados.id }, s2);
  assertEq(r.ok, false);
  assertEq(r.erro.codigo, 'NAO_ENCONTRADO');
  // Sub ainda existe
  const chk = db.exec('SELECT COUNT(*) AS c FROM subtarefas WHERE id = ?', [s.dados.id]);
  assertEq(chk.dados[0].c, 1);
  db.fechar();
});

t('sem sessao nega operacao (re-check apos novos testes)', async () => {
  const db = criarDbTeste();
  const { listar } = await import('../src/js/backend/core/tarefas.js');
  const r = listar(db, {}, {});
  assertEq(r.ok, false);
  assertEq(r.erro.codigo, 'NAO_AUTENTICADO');
  db.fechar();
});

console.log(`\n${passou}/${total} passou`);
process.exit(passou === total ? 0 : 1);
