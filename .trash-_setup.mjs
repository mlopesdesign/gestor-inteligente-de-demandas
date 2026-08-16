// tests/_setup.mjs — runner de testes minimalista (sem dependência)
// Lista arquivos test-*.mjs e roda, contando pass/fail.

import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let total = 0, passed = 0, failed = 0;
const failures = [];

export async function test(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
    failures.push({ name, error: e });
  }
}

// better-sqlite3: db.exec(sql) NAO aceita params. db.prepare(sql).run(params) sim.
export function dbRun(db, sql, params = []) {
  return db.prepare(sql).run(params);
}

// Adapta better-sqlite3 (que tem API diferente do sql.js) pra API do wrapper
// usada pelos core/*.js: { exec(sql, params) -> { ok, dados } }
export function wrapDb(db) {
  return {
    exec(sql, params = []) {
      try {
        if (/^\s*(select|pragma)/i.test(sql)) {
          // SELECT: retorna array de rows
          const rows = db.prepare(sql).all(params);
          return { ok: true, dados: rows };
        } else {
          // INSERT/UPDATE/DELETE: retorna { changes, lastInsertRowid }
          const info = db.prepare(sql).run(params);
          return { ok: true, dados: { changes: info.changes, lastInsertRowid: info.lastInsertRowid } };
        }
      } catch (e) {
        return { ok: false, erro: e.message };
      }
    },
    transacao(ops) {
      const wrap = this;
      const begin = db.transaction(() => {
        const r = ops.map(op => wrap.exec(op.sql, op.params));
        if (r.some(x => !x.ok)) throw new Error('transacao falhou');
        return r;
      });
      try {
        return { ok: true, dados: begin() };
      } catch (e) {
        return { ok: false, erro: e.message };
      }
    },
  };
}

// Se rodado direto: roda todos os test-*.mjs
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const files = readdirSync(__dirname).filter(f => /^test-.*\.mjs$/.test(f)).sort();
  for (const f of files) {
    console.log(`\n=== ${f} ===`);
    await import(join(__dirname, f));
  }
  console.log(`\n========================================`);
  console.log(`Total: ${passed}/${total} passou${failed > 0 ? ` (${failed} falhou)` : ''}`);
  process.exit(failed > 0 ? 1 : 0);
}
