// Testa com prepared statement
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
const schema = readFileSync('src/schema.sql', 'utf-8');
const db = new Database(':memory:');
db.exec(schema);
const uid = '01AREATEST';
try {
  const stmt = db.prepare(
    `INSERT INTO usuarios(id, email, senha_hash, nome, criado_em, atualizado_em, versao, dono_id) VALUES(?,?,?,?,?,?,1,?)`
  );
  stmt.run(uid, 'a@b.c', 'x', 'Teste', new Date().toISOString(), new Date().toISOString(), uid);
  console.log('OK inserido via prepare/run');
  const r = db.prepare('SELECT id, email, nome FROM usuarios').all();
  console.log('Usuarios:', r);
} catch (e) {
  console.error('ERRO:', e.message);
}
