// tests/test-sync.mjs — v0.2.36: enfileirarMudanca + enviarPush
//
// Cobre o bug critico do cursor: antes o push usava ultimo_pull_id,
// o que filtrava errado quando um pull trazia IDs altos do servidor.
// O fix separa os cursores: ultimo_push_id e proprio do push.
//
// O teste mocka window.NL_PORT e globalThis.fetch pra rodar
// o codigo do sync.js fora do Neutralino (mesmo padrao dos outros testes).

import assert from 'node:assert/strict';
import { criarDbTeste, SESSAO } from './setup.mjs';

// === Mock do ambiente Neutralino (sync.js detecta NO_APP via !window.NL_PORT) ===
globalThis.window = { NL_PORT: 1, NEUTRALINO_GLOBALS: {} };
// resolverAppdata() sincrono cai pra process.env.APPDATA quando NO_APP=false.
// Sem essa var, dataDir() lanca e o readState do sync explode.
process.env.APPDATA = 'C:\\Users\\teste\\AppData\\Roaming';
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify({ success: true, data: { aplicadas: 1, conflitos: 0 } }),
});

// Estado mockado em memoria (substitui o sync_state.json)
let MOCK_STATE = {
  wp_url: 'https://teste.local/wp-json/gestor/v1',
  wp_token: 'TKN_TESTE',
  wp_email: 'teste@teste.local',
  wp_usuario_id: 'USR_REMOTO',
  wp_dispositivo_id: 'desktop-teste',
  wp_expira_em: null,
  ultimo_sync: null,
  ultimo_pull_id: 0,
  ultimo_push_id: 0,
};
let MUTACOES_RECEBIDAS = [];

// Mocka o filesystem do Neutralino pra interceptar writeState/readState
globalThis.window.Neutralino = {
  filesystem: {
    async readFile(_path) {
      // readState faz .readFile(statePath()) — em NO_APP retorna emptyState
      throw new Error('NO_APP');
    },
    async writeFile(_path, _data) { /* no-op */ },
  },
  os: { getEnv: () => 'C:\\Users\\teste\\AppData\\Roaming\\GestorInteligenteDeDemandas\\dados' },
};

// Mocka a funcao de fetch do sync.js reescrevendo wpFetch via fetch global.
// Cada chamada captura o body enviado em MUTACOES_RECEBIDAS pra inspecao.
const fetchOriginal = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const body = opts?.body ? JSON.parse(opts.body) : null;
  if (body?.mutacoes) {
    MUTACOES_RECEBIDAS.push({ url, mutacoes: body.mutacoes });
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        success: true,
        data: { aplicadas: body.mutacoes.length, conflitos: 0 },
      }),
    };
  }
  return { ok: true, status: 200, text: async () => '{"success":true,"data":{}}' };
};

const { enfileirarMudanca, status: statusSync, push: pushSync } =
  await import('../src/js/backend/core/sync.js');

const tarefasCore = await import('../src/js/backend/core/tarefas.js');

let testesPassaram = 0;
function teste(nome, fn) {
  return Promise.resolve().then(fn).then(
    () => { testesPassaram++; console.log('  \u2713 ' + nome); },
    (e) => { console.error('  \u2717 ' + nome + ': ' + e.message); throw e; }
  );
}

await teste('enfileirarMudanca insere em sync_mudancas com aplicada=0', () => {
  const db = criarDbTeste();
  const id = 'TAREFA_T01';
  // Cria direto pra ter o registro
  db.exec(
    `INSERT INTO tarefas(id, usuario_id, dono_id, titulo, status, criado_em, atualizado_em, versao)
     VALUES(?,?,?,?,?,?,?,1)`,
    [id, SESSAO.usuario_id, SESSAO.usuario_id, 'Tarefa teste', 'PLANEJADA',
     new Date().toISOString(), new Date().toISOString()]
  );
  const r = enfileirarMudanca(
    db, SESSAO, 'tarefas', 'UPSERT', id, 1,
    { id, titulo: 'Tarefa teste', status: 'PLANEJADA', versao: 1 }
  );
  assert.equal(r.ok, true);
  const check = db.exec(
    `SELECT tabela, operacao, versao, aplicada FROM sync_mudancas WHERE registro_id = ? AND usuario_id = ?`,
    [id, SESSAO.usuario_id]
  );
  assert.equal(check.dados.length, 1);
  assert.equal(check.dados[0].tabela, 'tarefas');
  assert.equal(check.dados[0].operacao, 'UPSERT');
  assert.equal(check.dados[0].versao, 1);
  assert.equal(check.dados[0].aplicada, 0);
});

await teste('enfileirarMudanca recusa tabela nao sincronizavel', () => {
  const db = criarDbTeste();
  const r = enfileirarMudanca(db, SESSAO, 'subtarefas', 'UPSERT', 'X', 1, { id: 'X' });
  assert.equal(r.ok, false);
  assert.equal(r.erro.codigo, 'TABELA_NAO_SINCRONIZAVEL');
});

await teste('enfileirarMudanca recusa sessao sem usuario_id', () => {
  const db = criarDbTeste();
  const r = enfileirarMudanca(db, {}, 'tarefas', 'UPSERT', 'X', 1, {});
  assert.equal(r.ok, false);
  assert.equal(r.erro.codigo, 'NAO_AUTENTICADO');
});

await teste('tarefas.criar enfileira mudanca automaticamente', () => {
  const db = criarDbTeste();
  const r = tarefasCore.criar(db, { titulo: 'Smoke tarefa sync' }, SESSAO);
  assert.equal(r.ok, true);
  const check = db.exec(
    `SELECT tabela, operacao, registro_id FROM sync_mudancas WHERE usuario_id = ?`,
    [SESSAO.usuario_id]
  );
  assert.equal(check.dados.length, 1);
  assert.equal(check.dados[0].tabela, 'tarefas');
  assert.equal(check.dados[0].operacao, 'UPSERT');
  assert.equal(check.dados[0].registro_id, r.dados.id);
});

await teste('tarefas.atualizar enfileira mudanca com versao nova', () => {
  const db = criarDbTeste();
  const c = tarefasCore.criar(db, { titulo: 'Tarefa pra atualizar' }, SESSAO);
  assert.equal(c.ok, true);
  // Limpa sync_mudancas pra isolar o teste
  db.exec(`DELETE FROM sync_mudancas WHERE usuario_id = ?`, [SESSAO.usuario_id]);
  const a = tarefasCore.atualizar(
    db, { id: c.dados.id, versao: 1, titulo: 'Tarefa atualizada' },
    SESSAO
  );
  assert.equal(a.ok, true);
  const check = db.exec(
    `SELECT versao FROM sync_mudancas WHERE registro_id = ? AND usuario_id = ?`,
    [c.dados.id, SESSAO.usuario_id]
  );
  assert.equal(check.dados.length, 1);
  assert.equal(check.dados[0].versao, 2);
});

await teste('push envia mutacoes pendentes e atualiza cursor (FIX v0.2.36)', async () => {
  const db = criarDbTeste();
  // Cria 3 tarefas
  const ids = [];
  for (let i = 0; i < 3; i++) {
    const r = tarefasCore.criar(db, { titulo: 'Tarefa push ' + i }, SESSAO);
    assert.equal(r.ok, true);
    ids.push(r.dados.id);
  }
  MUTACOES_RECEBIDAS.length = 0;
  // Reset state: cursor em 0 — todas as 3 devem ir
  MOCK_STATE.ultimo_push_id = 0;
  MOCK_STATE.ultimo_pull_id = 999; // proposital: alto, simulando pull anterior
  globalThis.window.Neutralino.filesystem.readFile = async () => {
    return new TextEncoder().encode(JSON.stringify(MOCK_STATE));
  };
  const res = await pushSync(db, {}, SESSAO);
  assert.equal(res.ok, true, 'push deve ter sucesso: ' + JSON.stringify(res));
  assert.equal(res.dados.aplicadas, 3);
  // Deve ter feito UMA chamada ao /sync/push com 3 mutacoes
  assert.equal(MUTACOES_RECEBIDAS.length, 1);
  assert.equal(MUTACOES_RECEBIDAS[0].mutacoes.length, 3);
  // As mutacoes devem ter IDs das 3 tarefas
  const enviadas = MUTACOES_RECEBIDAS[0].mutacoes.map(m => m.registro_id).sort();
  assert.deepEqual(enviadas, ids.sort());
});

await teste('segundo push nao reenvia as mesmas mudancas (cursor impede)', async () => {
  const db = criarDbTeste();
  MUTACOES_RECEBIDAS.length = 0;
  // Marca todas como ja aplicadas (simula primeiro push)
  db.exec(`UPDATE sync_mudancas SET aplicada = 1 WHERE usuario_id = ?`, [SESSAO.usuario_id]);
  // Seta cursor como se ja tivesse enviado tudo
  const max = db.exec(`SELECT MAX(id) AS m FROM sync_mudancas WHERE usuario_id = ?`,
                       [SESSAO.usuario_id]);
  const maxId = Number(max.dados[0].m) || 0;
  MOCK_STATE.ultimo_push_id = maxId;
  MOCK_STATE.ultimo_pull_id = maxId + 100; // proposital
  globalThis.window.Neutralino.filesystem.readFile = async () => {
    return new TextEncoder().encode(JSON.stringify(MOCK_STATE));
  };
  const res = await pushSync(db, {}, SESSAO);
  assert.equal(res.ok, true);
  assert.equal(res.dados.aplicadas, 0, 'segundo push nao deve reenviar nada');
  assert.equal(MUTACOES_RECEBIDAS.length, 0);
});

await teste('criar tarefa depois de pull com ID alto NAO e filtrada (FIX v0.2.36)', async () => {
  // Reproduz o bug: o pull trouxe um registro do servidor com id 5000.
  // Antes do fix, ultimo_pull_id=5000 era usado como cursor do push,
  // e qualquer mudanca local com id < 5000 era IGNORADA.
  const db = criarDbTeste();
  // Simula: pull anterior deixou ultimo_pull_id alto
  MOCK_STATE.ultimo_pull_id = 5000;
  MOCK_STATE.ultimo_push_id = 0; // novo fix: push usa cursor proprio
  globalThis.window.Neutralino.filesystem.readFile = async () => {
    return new TextEncoder().encode(JSON.stringify(MOCK_STATE));
  };
  MUTACOES_RECEBIDAS.length = 0;
  // Cria tarefa local
  const c = tarefasCore.criar(db, { titulo: 'Tarefa apos pull' }, SESSAO);
  assert.equal(c.ok, true);
  // O push deve pegar a mudanca local mesmo com ultimo_pull_id alto
  const res = await pushSync(db, {}, SESSAO);
  assert.equal(res.ok, true);
  assert.equal(res.dados.aplicadas, 1, 'push deve enviar a mudanca local');
  assert.equal(MUTACOES_RECEBIDAS.length, 1);
  assert.equal(MUTACOES_RECEBIDAS[0].mutacoes.length, 1);
  assert.equal(MUTACOES_RECEBIDAS[0].mutacoes[0].registro_id, c.dados.id);
});

await teste('status retorna contadores sem chamar WP', async () => {
  const db = criarDbTeste();
  // Cria 2 tarefas (gera 2 mudancas locais)
  for (let i = 0; i < 2; i++) {
    const r = tarefasCore.criar(db, { titulo: 'Stat ' + i }, SESSAO);
    assert.equal(r.ok, true);
  }
  globalThis.window.Neutralino.filesystem.readFile = async () => {
    return new TextEncoder().encode(JSON.stringify({ ...MOCK_STATE, ultimo_push_id: 0 }));
  };
  const st = await statusSync(db, {}, SESSAO);
  assert.equal(st.ok, true);
  assert.equal(st.dados.conectado, true);
  assert.equal(st.dados.mudancas_pendentes, 2);
});

console.log('\n' + testesPassaram + '/' + testesPassaram + ' passou');
process.exit(0);
