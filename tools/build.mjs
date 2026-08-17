#!/usr/bin/env node
// tools/build.mjs — empacota o app Neutralino
//
// 1. Garante vendor (sql-wasm.js, neutralino.js) via download-vendor.mjs
// 2. Copia schema.sql para src/schema.sql (Neutralino serve /src/)
// 3. Roda `neu build` (gera resources.neu em dist/, MAS COM BUG DE 3 BYTES)
// 4. Rebuilda o resources.neu com build-neu.py (corrigindo o bug)
// 5. Copia o binário do Neutralino (GestorInteligenteDeDemandas.exe)

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');
const tools = join(root, 'tools');
const neutralinoBin = join(tools, 'neutralino', 'neutralino-win_x64.exe');

console.log('[build] 1/5 vendor...');
execFileSync('node', [join(tools, 'download-vendor.mjs')], { stdio: 'inherit' });

// 2. Garante schema.sql em src/ (Neutralino serve /src/)
const schemaSrc = join(root, 'schema.sql');
const schemaDst = join(src, 'schema.sql');
if (existsSync(schemaSrc)) {
  copyFileSync(schemaSrc, schemaDst);
  console.log(`[build] 2/5 schema.sql copiado para ${schemaDst}`);
}

// 3. Limpa dist/ anterior
if (existsSync(dist)) {
  rmSync(dist, { recursive: true, force: true });
}
mkdirSync(dist, { recursive: true });

// 4. neu build (gera resources.neu com bug - 3 bytes de padding)
console.log('[build] 3/5 neu build (gera .neu com bug, sera reescrito)...');
// Tenta achar o 'neu' no PATH ou no AppData/Roaming/npm
const neuCmd = existsSync(join(process.env.APPDATA || '', 'npm', 'neu.cmd'))
  ? join(process.env.APPDATA || '', 'npm', 'neu.cmd')
  : 'neu';
const r = spawnSync(neuCmd, ['build'], { cwd: root, stdio: 'inherit', shell: true });
if (r.status !== 0) {
  console.error('[build] neu build falhou');
  process.exit(1);
}

// 5. Rebuilda o .neu manualmente (corrige o bug, gera em dist/resources.neu)
console.log('[build] 4/5 rebuild .neu sem bug (build-neu.py)...');
const r2 = spawnSync('python', [join(tools, 'build-neu.py'), root], { stdio: 'inherit' });
if (r2.status !== 0) {
  console.error('[build] build-neu.py falhou');
  process.exit(1);
}

// 6. Empacota como app-image
console.log('[build] 5/5 empacotando app-image...');
const appImageDst = join(dist, 'GestorInteligenteDeDemandas');
if (existsSync(appImageDst)) rmSync(appImageDst, { recursive: true, force: true });
mkdirSync(appImageDst);

if (!existsSync(neutralinoBin)) {
  console.error(`[build] binario do Neutralino nao encontrado em ${neutralinoBin}`);
  console.error('  Rode: node tools/download-neutralino.mjs');
  process.exit(1);
}
copyFileSync(neutralinoBin, join(appImageDst, 'GestorInteligenteDeDemandas.exe'));
// Copia o resources.neu de dist/resources.neu (gerado pelo build-neu.py)
const srcNeu = join(dist, 'resources.neu');
if (!existsSync(srcNeu)) {
  console.error(`[build] resources.neu nao encontrado em ${srcNeu}`);
  process.exit(1);
}
copyFileSync(srcNeu, join(appImageDst, 'resources.neu'));

// FIX v0.2.19: copia o src/ inteiro pra app-image (era o motivo do "abre neutralino"
// no PC do usuario — o documentRoot: '/' + url: '/src/index.html' aponta pro disco,
// e sem src/ no Program Files o app nao tem onde carregar o HTML/CSS/JS)
import { cpSync } from 'node:fs';
const srcDir = join(src);
const dstSrc = join(appImageDst, 'src');
console.log(`[build] copiando src/ pra ${dstSrc}...`);
if (existsSync(dstSrc)) rmSync(dstSrc, { recursive: true, force: true });
cpSync(srcDir, dstSrc, { recursive: true });
console.log(`[build] OK src/ copiado`);

console.log(`[build] OK app-image em ${appImageDst}`);
console.log(`[build] Tamanho do .exe: ${(statSync(join(appImageDst, 'GestorInteligenteDeDemandas.exe')).size / 1024).toFixed(0)} KB`);
console.log(`[build] Tamanho do .neu: ${(statSync(join(appImageDst, 'resources.neu')).size / 1024).toFixed(0)} KB`);
