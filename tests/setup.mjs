// tests/setup.mjs — inicialização comum aos testes
// Abre um banco em memória via better-sqlite3 (Node 22+) e expõe como
// substituto do db.js do app. Os testes importam daqui e rodam regras de
// core/*.js que recebem db como primeiro parâmetro.

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = fs.readFileSync(path.join(root, 'schema.sql'), 'utf-8');

export function criarDbTeste() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  // Schema completo: better-sqlite3 aceita várias statements separadas por ;
  try {
    db.exec(schema);
  } catch (e) {
    console.error('schema falhou:', e.message);
    throw e;
  }
  // Cria usuario demo
  const agora = new Date().toISOString();
  db.prepare(
    `INSERT INTO usuarios(id, email, senha_hash, nome, criado_em, atualizado_em, versao, dono_id)
     VALUES(?,?,?,?,?,?,1,?)`
  ).run('USR01', 'teste@teste.local', 'hash', 'Tester', agora, agora, 'USR01');

  // Adaptador para o shape esperado pelos core/*.js (que usam db.exec)
  return {
    raw: db,
    exec(sql, params = []) {
      try {
        if (/^\s*select/i.test(sql)) {
          const rows = db.prepare(sql).all(params);
          return { ok: true, dados: rows };
        } else {
          const info = db.prepare(sql).run(params);
          return { ok: true, dados: { changes: info.changes, lastInsertRowid: info.lastInsertRowid } };
        }
      } catch (e) {
        return { ok: false, erro: e.message };
      }
    },
    transacao(ops) {
      const t = db.transaction(() => ops.map(op => this.exec(op.sql, op.params)));
      try { return { ok: true, dados: t() }; }
      catch (e) { return { ok: false, erro: e.message }; }
    },
    salvarAgora() { /* no-op em memoria */ },
    fechar() { db.close(); },
  };
}

export const SESSAO = {
  usuario_id: 'USR01',
  email: 'teste@teste.local',
  nome: 'Tester',
  dispositivo_id: 'DISP01',
  autenticado: true,
};
