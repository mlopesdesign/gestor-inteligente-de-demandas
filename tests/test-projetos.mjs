// tests/test-projetos.mjs
import { criarDbTeste, SESSAO } from './setup.mjs';

let total = 0, passou = 0;
function t(nome, fn) {
  total++;
  try { fn(); passou++; console.log(`  ✓ ${nome}`); }
  catch (e) { console.log(`  ✗ ${nome}: ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'falhou'); }
function assertEq(a, b, msg) { if (a !== b) throw new Error((msg||'') + ' esperado ' + b + ' obtido ' + a); }

console.log('test-projetos:');

t('criar com titulo obrigatorio', async () => {
  const db = criarDbTeste();
  const { criar } = await import('../src/js/backend/core/projetos.js');
  const r = criar(db, { titulo: 'Lancamento Site' }, SESSAO);
  assertEq(r.ok, true);
  assert(r.dados.id, 'sem id');
  db.fechar();
});

t('listar filtra por status', async () => {
  const db = criarDbTeste();
  const { criar, listar } = await import('../src/js/backend/core/projetos.js');
  criar(db, { titulo: 'A' }, SESSAO);
  criar(db, { titulo: 'B', status: 'EM_ANDAMENTO' }, SESSAO);
  const r = listar(db, { status: 'EM_ANDAMENTO' }, SESSAO);
  assertEq(r.ok, true);
  assertEq(r.dados.length, 1);
  db.fechar();
});

t('concluir marca status=CONCLUIDO e termino_real_em', async () => {
  const db = criarDbTeste();
  const { criar, concluir, obter } = await import('../src/js/backend/core/projetos.js');
  const p = criar(db, { titulo: 'A' }, SESSAO).dados;
  const r = concluir(db, { id: p.id }, SESSAO);
  assertEq(r.ok, true);
  const o = obter(db, { id: p.id }, SESSAO);
  assertEq(o.dados.status, 'CONCLUIDO');
  assert(o.dados.termino_real_em, 'sem termino_real_em');
  db.fechar();
});

console.log(`\n${passou}/${total} passou`);
process.exit(passou === total ? 0 : 1);
