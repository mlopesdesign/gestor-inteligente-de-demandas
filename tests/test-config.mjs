// tests/test-config.mjs
import { criarDbTeste, SESSAO } from './setup.mjs';

let total = 0, passou = 0;
function t(nome, fn) {
  total++;
  try { fn(); passou++; console.log(`  ✓ ${nome}`); }
  catch (e) { console.log(`  ✗ ${nome}: ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'falhou'); }
function assertEq(a, b, msg) { if (a !== b) throw new Error((msg||'') + ' esperado ' + b + ' obtido ' + a); }

console.log('test-config:');

t('obter retorna usuario + cobranca + stats', async () => {
  const db = criarDbTeste();
  const { obter } = await import('../src/js/backend/core/config.js');
  const r = obter(db, {}, SESSAO);
  assertEq(r.ok, true);
  assert(r.dados.usuario, 'faltam usuario');
  assert(r.dados.cobranca, 'faltam cobranca');
  assert(r.dados.stats, 'faltam stats');
  db.fechar();
});

t('atualizar nome e fuso', async () => {
  const db = criarDbTeste();
  const { atualizar } = await import('../src/js/backend/core/config.js');
  const r = atualizar(db, { nome: 'Marcio Lopes', fuso: 'America/Sao_Paulo' }, SESSAO);
  assertEq(r.ok, true);
  assertEq(r.dados.usuario.nome, 'Marcio Lopes');
  db.fechar();
});

t('exportar retorna JSON com tabelas', async () => {
  const db = criarDbTeste();
  const { exportar } = await import('../src/js/backend/core/config.js');
  const r = exportar(db, {}, SESSAO);
  assertEq(r.ok, true);
  assert(r.dados.dados.usuarios, 'faltam usuarios');
  assert(r.dados.dados.areas !== undefined, 'faltam areas');
  db.fechar();
});

t('apagar remove todos os dados do usuario', async () => {
  const db = criarDbTeste();
  const { exportar, apagar } = await import('../src/js/backend/core/config.js');
  // insere uma area via raw
  db.raw.prepare(`INSERT INTO areas(id, usuario_id, dono_id, nome, cor, criado_em, atualizado_em, versao) VALUES(?,?,?,?,?,?,?,1)`)
    .run('01AREA_AP', SESSAO.usuario_id, SESSAO.usuario_id, 'A', '#888', new Date().toISOString(), new Date().toISOString());
  const r = apagar(db, {}, SESSAO);
  assertEq(r.ok, true);
  const ex = exportar(db, {}, SESSAO);
  assertEq(ex.dados.dados.areas.length, 0);
  db.fechar();
});

console.log(`\n${passou}/${total} passou`);
process.exit(passou === total ? 0 : 1);
