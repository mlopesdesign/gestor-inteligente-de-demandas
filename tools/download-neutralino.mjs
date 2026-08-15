#!/usr/bin/env node
// tools/download-neutralino.mjs - baixa Neutralino SDK portable
//
// Uso:  node tools/download-neutralino.mjs
// Saída: tools/neutralino/ (binarios + SDK)

import { existsSync, mkdirSync, statSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dst = join(root, 'tools', 'neutralino');

if (existsSync(join(dst, 'neutralinojs', 'bin', 'neutralino'))) {
  console.log('[download-neutralino] já existe em', dst);
  process.exit(0);
}

const url = 'https://github.com/neutralinojs/neutralinojs/releases/download/v6.3.0/neutralinojs-v6.3.0.zip';
const tmpZip = join(dst + '.zip');

console.log('[download-neutralino] baixando', url);
mkdirSync(dst, { recursive: true });

// Usa PowerShell (já que está no Windows e não tem curl confiável)
execFileSync('powershell.exe', ['-NoProfile', '-Command',
  `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri "${url}" -OutFile "${tmpZip}"`
], { stdio: 'inherit' });

console.log('[download-neutralino] ZIP:', statSync(tmpZip).size, 'bytes');
console.log('[download-neutralino] extraindo...');
execFileSync('powershell.exe', ['-NoProfile', '-Command',
  `Expand-Archive -Path "${tmpZip}" -DestinationPath "${dst}" -Force`
], { stdio: 'inherit' });

rmSync(tmpZip);
console.log('[download-neutralino] OK em', dst);
