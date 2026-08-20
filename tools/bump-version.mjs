#!/usr/bin/env node
// tools/bump-version.mjs - bump de versao em 6 lugares (PADRAO §6).
//
// 1. neutralino.config.json -> applicationId nao muda; version sim
// 2. package.json -> version
// 3. src/js/app.js -> comentario com a versao + 2 fallbacks (versao='X.Y.Z' e login-rodape)
// 4. src/index.html -> meta name="app-version" + meta name="app-build" (FIX v0.2.34:
//    antes o bump NAO atualizava o index.html, e o app sempre mostrava
//    a versao antiga da meta tag, pedindo update falso no auto-update)
// 5. installer/gestor.nsi -> !define APP_VERSION "X.Y.Z"
// 6. update.json (raiz) -> version, notes (resumido), resourcesURL
//
// Uso:  node tools/bump-version.mjs 0.2.0
//
// IMPORTANTE: depois do bump, rodar `node tools/build.mjs` + makensis pra
// rebuildar, calcular o SHA256 do .neu NOVO, e atualizar o SHA/size do
// update.json. Esse script NAO faz o rebuild nem o calculo de SHA.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const versao = process.argv[2];
if (!versao || !/^\d+\.\d+\.\d+$/.test(versao)) {
  console.error('Uso: node tools/bump-version.mjs X.Y.Z');
  process.exit(1);
}

const data = new Date().toISOString().slice(0, 10);
console.log(`[bump] ${versao} (${data})`);

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

// 3. src/js/app.js (comentario + 2 fallbacks)
const aPath = join(root, 'src', 'js', 'app.js');
let a = readFileSync(aPath, 'utf-8');
a = a.replace(/(\/\*\*\s*\n\s*\*\s*Gestor Inteligente de Demandas v)\d+\.\d+\.\d+/, '$1' + versao);
// Fallback 1: `if (!versao) versao = 'X.Y.Z';`
a = a.replace(/(if \(!versao\) versao = ')\d+\.\d+\.\d+(';)/, '$1' + versao + '$2');
// Fallback 2: `|| 'X.Y.Z'` no login-rodape
a = a.replace(/(window\.__appVersion \|\| ')\d+\.\d+\.\d+(')/, '$1' + versao + '$2');
writeFileSync(aPath, a);
console.log(`[bump] src/js/app.js: v${versao}`);

// 4. src/index.html (meta tags)
const hPath = join(root, 'src', 'index.html');
let h = readFileSync(hPath, 'utf-8');
h = h.replace(/(<meta name="app-version" content=")\d+\.\d+\.\d+(">)/, '$1' + versao + '$2');
h = h.replace(/(<meta name="app-build" content=")\d+\.\d+\.\d+-\d{4}-\d{2}-\d{2}(">)/, '$1' + versao + '-' + data + '$2');
writeFileSync(hPath, h);
console.log(`[bump] src/index.html: v${versao}-${data}`);

// 5. installer/gestor.nsi
const nPath = join(root, 'installer', 'gestor.nsi');
let n = readFileSync(nPath, 'utf-8');
n = n.replace(/(!define APP_VERSION ")\d+\.\d+\.\d+(")/, '$1' + versao + '$2');
writeFileSync(nPath, n);
console.log(`[bump] installer/gestor.nsi: v${versao}`);

// 6. update.json (raiz) - so atualiza version, NAO mexe em sha256/size
// (esses vem do build, calcular depois)
const uPath = join(root, 'update.json');
if (readFileSync) {
  try {
    const u = JSON.parse(readFileSync(uPath, 'utf-8'));
    const oldVersion = u.version;
    u.version = versao;
    if (u.notes && !u.notes.startsWith('v' + versao)) {
      u.notes = 'v' + versao + ' - ' + (u.notes.split(' - ').slice(1).join(' - ') || u.notes);
    }
    if (u.resourcesURL && u.resourcesURL.includes('/v' + oldVersion + '/')) {
      u.resourcesURL = u.resourcesURL.replace('/v' + oldVersion + '/', '/v' + versao + '/');
    }
    writeFileSync(uPath, JSON.stringify(u, null, 2) + '\n');
    console.log(`[bump] update.json: v${versao} (sha256 e size NAO atualizados - rodar build depois)`);
  } catch (e) {
    console.log(`[bump] update.json: skip (${e.message})`);
  }
}

console.log(`[bump] OK. PROXIMO PASSO:`);
console.log(`  1. node tools/build.mjs + makensis`);
console.log(`  2. calcular SHA256 do .neu novo (NÃO do Setup.exe)`);
console.log(`  3. atualizar sha256/size no update.json`);
console.log(`  4. git tag v${versao} + push + gh release create`);
