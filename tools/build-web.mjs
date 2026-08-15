#!/usr/bin/env node
// tools/build-web.mjs — copia web/ para o destino que o servidor expõe.
//
// Como o Javalin serve web/ via staticFiles em runtime, este script
// apenas valida que os arquivos existem e conta-os. Em F7 pode passar
// a fazer minificação/otimização.

import { readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webDir = join(root, 'web');

function walk(dir, base = '') {
  const out = [];
  for (const ent of readdirSync(dir)) {
    const p = join(dir, ent);
    const rel = join(base, ent);
    if (statSync(p).isDirectory()) out.push(...walk(p, rel));
    else out.push(rel);
  }
  return out;
}

const files = walk(webDir);
console.log(`[build-web] ${files.length} arquivo(s) em web/:`);
for (const f of files) console.log('  ' + f);
console.log('[build-web] OK (servidor serve web/ direto via staticFiles)');
