#!/usr/bin/env node
// tools/download-vendor.mjs - baixa sql.js (WASM) e neutralino.js (client lib)
//
// Uso:  node tools/download-vendor.mjs
// Saída: src/js/vendor/

import { existsSync, mkdirSync, statSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vendorDir = join(root, 'src', 'js', 'vendor');
mkdirSync(vendorDir, { recursive: true });

function psDownload(url, out) {
  return execFileSync('powershell.exe', ['-NoProfile', '-Command',
    `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri "${url}" -OutFile "${out}"`
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
}

function psUnzip(zipPath, destDir) {
  return execFileSync('powershell.exe', ['-NoProfile', '-Command',
    `Expand-Archive -Path "${zipPath}" -DestinationPath "${destDir}" -Force`
  ], { stdio: 'inherit' });
}

async function ensureFile(name, url) {
  const out = join(vendorDir, name);
  if (existsSync(out) && statSync(out).size > 1000) {
    console.log(`[vendor] ${name} já existe, pulando`);
    return;
  }
  console.log(`[vendor] baixando ${name} de ${url}`);
  psDownload(url, out);
  console.log(`[vendor] ${name}: ${statSync(out).size} bytes`);
}

// 1. neutralino.js (client lib) — CDN oficial
await ensureFile(
  'neutralino.js',
  'https://cdn.jsdelivr.net/npm/@neutralinojs/lib@6.3.0/dist/neutralino.js'
);

// 2. sql-wasm.js + sql-wasm.wasm — release oficial v1.10.3
// O release tem um ZIP `sqljs-wasm.zip` com os 2 arquivos.
const sqlJsWasmZip = join(root, 'data', 'sqljs-wasm.zip');
if (!existsSync(join(vendorDir, 'sql-wasm.wasm'))) {
  console.log('[vendor] baixando sqljs-wasm.zip');
  psDownload(
    'https://github.com/sql-js/sql.js/releases/download/v1.10.3/sqljs-wasm.zip',
    sqlJsWasmZip
  );
  // Extrai direto pra src/js/vendor/
  const tmpExtract = join(root, 'data', 'sqljs-wasm-extract');
  rmSync(tmpExtract, { recursive: true, force: true });
  mkdirSync(tmpExtract, { recursive: true });
  psUnzip(sqlJsWasmZip, tmpExtract);
  // O ZIP solta os arquivos na raiz do extract (sem subpasta)
  for (const f of readdirSync(tmpExtract)) {
    if (f === 'sql-wasm.js' || f === 'sql-wasm.wasm') {
      const src = join(tmpExtract, f);
      const dst = join(vendorDir, f);
      if (!existsSync(dst)) {
        execFileSync('powershell.exe', ['-NoProfile', '-Command',
          `Copy-Item "${src}" "${dst}"`], { stdio: 'inherit' });
      }
    }
  }
  rmSync(tmpExtract, { recursive: true, force: true });
  rmSync(sqlJsWasmZip);
  console.log(`[vendor] sql-wasm.js: ${statSync(join(vendorDir, 'sql-wasm.js')).size} bytes`);
  console.log(`[vendor] sql-wasm.wasm: ${statSync(join(vendorDir, 'sql-wasm.wasm')).size} bytes`);
}

console.log('[vendor] OK em', vendorDir);
