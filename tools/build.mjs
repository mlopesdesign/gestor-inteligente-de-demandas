#!/usr/bin/env node
// tools/build.mjs — empacota o app Neutralino
//
// 1. Garante vendor (sql-wasm.js, neutralino.js) via download-vendor.mjs
// 2. Copia schema.sql para src/schema.sql (Neutralino serve /src/)
// 3. Roda `neu build` (gera resources.neu em dist/)
// 4. Empacota como app-image (binario do Neutralino + resources.neu) em
//    dist/GestorInteligenteDeDemandas/
//
// Requer: Neutralino CLI instalado via `npm i -g @neutralinojs/neu`
//         (no dev). Em runtime NAO precisa — Neutralino ja vem com o binario.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, cpSync, rmSync, statSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');
const tools = join(root, 'tools');
const neutralinoBin = join(tools, 'neutralino', 'neutralino-win_x64.exe');

console.log('[build] 1/4 vendor...');
execFileSync('node', [join(tools, 'download-vendor.mjs')], { stdio: 'inherit' });

// 2. Garante schema.sql em src/ (Neutralino serve /src/)
const schemaSrc = join(root, 'schema.sql');
const schemaDst = join(src, 'schema.sql');
if (existsSync(schemaSrc)) {
  copyFileSync(schemaSrc, schemaDst);
  console.log(`[build] 2/4 schema.sql copiado para ${schemaDst}`);
}

// 3. Limpa dist/ anterior
if (existsSync(dist)) {
  rmSync(dist, { recursive: true, force: true });
}
mkdirSync(dist, { recursive: true });

// 4. neu build (gera resources.neu)
console.log('[build] 3/4 neu build...');
const r = spawnSync('neu', ['build', '--mode=prod', '--release'], { cwd: root, stdio: 'inherit' });
if (r.status !== 0) {
  console.error('[build] neu build falhou');
  process.exit(1);
}

// 5. Empacota como app-image
console.log('[build] 4/4 empacotando app-image...');
mkdirSync(dist, { recursive: true });
const appImageDst = join(dist, 'GestorInteligenteDeDemandas');
if (existsSync(appImageDst)) rmSync(appImageDst, { recursive: true, force: true });
mkdirSync(appImageDst);

if (!existsSync(neutralinoBin)) {
  console.error(`[build] binario do Neutralino nao encontrado em ${neutralinoBin}`);
  console.error('  Rode: node tools/download-neutralino.mjs');
  process.exit(1);
}
copyFileSync(neutralinoBin, join(appImageDst, 'GestorInteligenteDeDemandas.exe'));
// Copia o resources.neu
const neuFile = join(dist, 'GestorInteligenteDeDemandas', 'resources.neu');
if (!existsSync(neuFile)) {
  // neu build cria em dist/GestorInteligenteDeDemandas/resources.neu
  console.error('[build] resources.neu nao encontrado em', dist);
  process.exit(1);
}

console.log(`[build] OK app-image em ${appImageDst}`);
console.log(`[build] Tamanho do .exe: ${(statSync(join(appImageDst, 'GestorInteligenteDeDemandas.exe')).size / 1024).toFixed(0)} KB`);
