// tests/test-busca.mjs
import { criarDbTeste, SESSAO } from './setup.mjs';

let total = 0, passou = 0;
function t(nome, fn) {
  total++;
  try { fn(); passou++; console.log(`  ✓ ${nome}`); }
  catch (e) { console.log(`  ✗ ${nome}: ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'falhou'); }
function assertEq(a, b, msg) { if (a !== b) throw new Error((msg||'') + ' esperado ' + b + ' obtido ' + a); }

console.log('test-busca:');

t('query curta (<2) retorna vazio', async () => {
  const db = criarDbTeste();
  const { global_ } = await import('../src/js/backend/core/busca.js');
  const r = global_(db, { q: 'a' }, SESSAO);
  assertEq(r.ok, true);
  assertEq(r.dados.tarefas.length, 0);
  db.fechar();
});

t('encontra tarefa por titulo', async () => {
  const db = criarDbTeste();
  const { global_ } = await import('../src/js/backend/core/busca.js');
  db.raw.prepare(`INSERT INTO tarefas(id, usuario_id, dono_id, titulo, status, prioridade, nivel_cobranca, criado_em, atualizado_em, versao) VALUES(?,?,?,?,?,?,?,?,?,1)`)
    .run('01BT1', SESSAO.usuario_id, SESSAO.usuario_id, 'Ligar para Joao', 'PLANEJADA', 'NORMAL', 'PERSISTENTE', new Date().toISOString(), new Date().toISOString());
  const r = global_(db, { q: 'joao' }, SESSAO);
  assertEq(r.dados.tarefas.length, 1);
  db.fechar();
});

console.log(`\n${passou}/${total} passou`);
process.exit(passou === total ? 0 : 1);
