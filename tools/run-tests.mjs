#!/usr/bin/env node
// tools/run-tests.mjs — roda todos os testes em tests/test-*.mjs
// Requer:  npm install (better-sqlite3 como devDep)
//
// Uso:  node tools/run-tests.mjs
// Saída: numero de testes passados, falhados; codigo de saida 0 se todos OK.

import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = join(root, 'tests');
const arquivos = readdirSync(testsDir)
  .filter(f => f.startsWith('test-') && f.endsWith('.mjs'))
  .sort();

let total = 0, ok = 0;
const falhas = [];

for (const f of arquivos) {
  console.log(`\n=== ${f} ===`);
  const r = spawnSync('node', [join(testsDir, f)], { stdio: 'inherit' });
  if (r.status === 0) ok++;
  else { falhas.push(f); }
  total++;
}

console.log('\n========================================');
console.log(`Total: ${ok}/${total} suites passaram`);
if (falhas.length > 0) {
  console.log('FALHAS:', falhas.join(', '));
  process.exit(1);
}
process.exit(0);
