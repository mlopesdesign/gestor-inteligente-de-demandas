// tests/test-areas.mjs
import { criarDbTeste, SESSAO } from './setup.mjs';

let total = 0, passou = 0;
function t(nome, fn) {
  total++;
  try { fn(); passou++; console.log(`  ✓ ${nome}`); }
  catch (e) { console.log(`  ✗ ${nome}: ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'falhou'); }
function assertEq(a, b, msg) { if (a !== b) throw new Error((msg||'') + ' esperado ' + b + ' obtido ' + a); }

console.log('test-areas:');

t('criar area devolve id', async () => {
  const db = criarDbTeste();
  const { criar } = await import('../src/js/backend/core/areas.js');
  const r = criar(db, { nome: 'Trabalho', cor: '#f0a000' }, SESSAO);
  assertEq(r.ok, true);
  assert(r.dados.id, 'sem id');
  db.fechar();
});

t('criar sem nome falha', async () => {
  const db = criarDbTeste();
  const { criar } = await import('../src/js/backend/core/areas.js');
  const r = criar(db, { nome: '' }, SESSAO);
  assertEq(r.ok, false);
  assertEq(r.erro.codigo, 'VALIDACAO');
  db.fechar();
});

t('listar retorna areas do usuario', async () => {
  const db = criarDbTeste();
  const { criar, listar } = await import('../src/js/backend/core/areas.js');
  criar(db, { nome: 'A' }, SESSAO);
  criar(db, { nome: 'B' }, SESSAO);
  const r = listar(db, {}, SESSAO);
  assertEq(r.ok, true);
  assertEq(r.dados.length, 2);
  db.fechar();
});

t('excluir area em uso falha', async () => {
  const db = criarDbTeste();
  const { criar, excluir } = await import('../src/js/backend/core/areas.js');
  const a = criar(db, { nome: 'A' }, SESSAO).dados;
  db.raw.prepare(`INSERT INTO tarefas(id, usuario_id, dono_id, titulo, status, prioridade, nivel_cobranca, area_id, criado_em, atualizado_em, versao) VALUES(?,?,?,?,?,?,?,?,?,?,1)`)
    .run('01TASKT', SESSAO.usuario_id, SESSAO.usuario_id, 't', 'PLANEJADA', 'NORMAL', 'PERSISTENTE', a.id, new Date().toISOString(), new Date().toISOString());
  const r = excluir(db, { id: a.id }, SESSAO);
  assertEq(r.ok, false);
  assertEq(r.erro.codigo, 'EM_USO');
  db.fechar();
});

console.log(`\n${passou}/${total} passou`);
process.exit(passou === total ? 0 : 1);
