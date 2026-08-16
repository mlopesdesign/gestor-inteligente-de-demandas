// tests/test-clientes.mjs
import { criarDbTeste, SESSAO } from './setup.mjs';

let total = 0, passou = 0;
function t(nome, fn) {
  total++;
  try { fn(); passou++; console.log(`  ✓ ${nome}`); }
  catch (e) { console.log(`  ✗ ${nome}: ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'falhou'); }
function assertEq(a, b, msg) { if (a !== b) throw new Error((msg||'') + ' esperado ' + b + ' obtido ' + a); }

console.log('test-clientes:');

t('criar com nome obrigatorio', async () => {
  const db = criarDbTeste();
  const { criar } = await import('../src/js/backend/core/clientes.js');
  const r = criar(db, { nome: 'Joao Silva' }, SESSAO);
  assertEq(r.ok, true);
  assert(r.dados.id, 'sem id');
  db.fechar();
});

t('listar filtra por busca', async () => {
  const db = criarDbTeste();
  const { criar, listar } = await import('../src/js/backend/core/clientes.js');
  criar(db, { nome: 'Joao Silva' }, SESSAO);
  criar(db, { nome: 'Maria Souza' }, SESSAO);
  const r = listar(db, { busca: 'joao' }, SESSAO);
  assertEq(r.ok, true);
  assertEq(r.dados.length, 1);
  db.fechar();
});

t('arquivar marca arquivado_em', async () => {
  const db = criarDbTeste();
  const { criar, arquivar } = await import('../src/js/backend/core/clientes.js');
  const c = criar(db, { nome: 'Joao' }, SESSAO).dados;
  const r = arquivar(db, { id: c.id }, SESSAO);
  assertEq(r.ok, true);
  // verifica via raw
  const row = db.raw.prepare(`SELECT arquivado_em FROM clientes WHERE id = ?`).get(c.id);
  assert(row.arquivado_em, 'sem arquivado_em');
  db.fechar();
});

console.log(`\n${passou}/${total} passou`);
process.exit(passou === total ? 0 : 1);
