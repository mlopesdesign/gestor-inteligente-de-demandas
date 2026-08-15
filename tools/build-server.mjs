#!/usr/bin/env node
// tools/build-server.mjs — empacota server/ via Maven (mvn package)
//
// Uso:  node tools/build-server.mjs
// Requer:  . .\tools\setup-env.ps1   (configura JAVA_HOME e MAVEN_HOME)

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mvn = (() => {
  const m = join(root, 'tools', 'maven', 'apache-maven-3.9.9', 'bin', 'mvn.cmd');
  return existsSync(m) ? m : 'mvn';
})();

console.log(`[build-server] usando maven: ${mvn}`);
console.log(`[build-server] diretório: ${root}`);

try {
  execFileSync(mvn, [
    '-B', '-ntp',
    '-pl', 'server', '-am',
    'clean', 'package',
    '-DskipTests',
  ], { stdio: 'inherit', cwd: root });
  console.log('[build-server] OK');
} catch (e) {
  console.error('[build-server] FALHOU');
  process.exit(e.status || 1);
}
