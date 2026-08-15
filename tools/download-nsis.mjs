#!/usr/bin/env node
// tools/download-nsis.mjs - baixa NSIS 3.10 portatil
// Uso: node tools/download-nsis.mjs

import { existsSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dst = join(root, 'tools', 'nsis-3.10');

if (existsSync(join(dst, 'makensis.exe'))) {
  console.log('[download-nsis] ja existe em', dst);
  process.exit(0);
}

const url = 'https://sourceforge.net/projects/nsis/files/NSIS%203/3.10/nsis-3.10.zip/download';
const tmpZip = join(root, 'tools', 'nsis-3.10.zip');

console.log('[download-nsis] baixando', url);
mkdirSync(join(root, 'tools'), { recursive: true });
execFileSync('powershell.exe', ['-NoProfile', '-Command',
  `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri "${url}" -OutFile "${tmpZip}"`
], { stdio: 'inherit' });

console.log('[download-nsis] ZIP:', statSync(tmpZip).size, 'bytes');
console.log('[download-nsis] extraindo...');
mkdirSync(dst, { recursive: true });
execFileSync('powershell.exe', ['-NoProfile', '-Command',
  `Expand-Archive -Path "${tmpZip}" -DestinationPath "${dirname(dst)}" -Force`
], { stdio: 'inherit' });
rmSync(tmpZip);
console.log('[download-nsis] OK em', dst);
