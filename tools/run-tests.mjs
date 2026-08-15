#!/usr/bin/env node
// tools/run-tests.mjs — roda todos os testes (server + desktop) via Maven.
//
// Uso:  node tools/run-tests.mjs
// Requer:  . .\tools\setup-env.ps1

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mvn = (() => {
  const m = join(root, 'tools', 'maven', 'apache-maven-3.9.9', 'bin', 'mvn.cmd');
  return existsSync(m) ? m : 'mvn';
})();

console.log(`[run-tests] usando maven: ${mvn}`);
try {
  execFileSync(mvn, ['-B', '-ntp', 'test'], { stdio: 'inherit', cwd: root });
  console.log('[run-tests] OK');
} catch (e) {
  console.error('[run-tests] FALHOU');
  process.exit(e.status || 1);
}
