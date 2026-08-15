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

console.log(`\n${passou}/${total} passou`);
process.exit(passou === total ? 0 : 1);
