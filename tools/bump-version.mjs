#!/usr/bin/env node
// tools/bump-version.mjs — bump de versão em 3 lugares (PADRAO §6).
//
// 1. neutralino.config.json → applicationId nao muda; version sim
// 2. package.json → version
// 3. src/js/app.js → comentario com a versao
//
// Uso:  node tools/bump-version.mjs 0.2.0

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const versao = process.argv[2];
if (!versao || !/^\d+\.\d+\.\d+$/.test(versao)) {
  console.error('Uso: node tools/bump-version.mjs X.Y.Z');
  process.exit(1);
}

console.log(`[bump] ${versao}`);

// 1. neutralino.config.json
const cPath = join(root, 'neutralino.config.json');
const c = JSON.parse(readFileSync(cPath, 'utf-8'));
c.version = versao;
writeFileSync(cPath, JSON.stringify(c, null, 2) + '\n');
console.log(`[bump] neutralino.config.json: v${versao}`);

// 2. package.json
const pPath = join(root, 'package.json');
const p = JSON.parse(readFileSync(pPath, 'utf-8'));
p.version = versao;
writeFileSync(pPath, JSON.stringify(p, null, 2) + '\n');
console.log(`[bump] package.json: v${versao}`);

// 3. src/js/app.js (comentario)
const aPath = join(root, 'src', 'js', 'app.js');
let a = readFileSync(aPath, 'utf-8');
a = a.replace(/(\/\*\*\s*\n\s*\*\s*Gestor Inteligente de Demandas v)\d+\.\d+\.\d+/, '$1' + versao);
writeFileSync(aPath, a);
console.log(`[bump] src/js/app.js: v${versao}`);

console.log(`[bump] OK. Reinicie o app para ver a nova versão.`);
