import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

// 1. Processo do emulador
try {
  const out = execSync('cmd /c tasklist /FI "IMAGENAME eq emulator.exe" /FO LIST', { encoding: 'utf8' });
  console.log('=== tasklist emulator.exe ===');
  console.log(out.trim() || '(nao rodando)');
} catch (e) { console.log('tasklist erro: ' + e.message); }

// 2. Processo qemu
try {
  const out = execSync('cmd /c tasklist /FI "IMAGENAME eq qemu-system-x86_64.exe" /FO LIST', { encoding: 'utf8' });
  console.log('\n=== tasklist qemu-system-x86_64.exe ===');
  console.log(out.trim() || '(nao rodando)');
} catch (e) { console.log('qemu erro: ' + e.message); }

// 3. Log do emulador
const log = 'E:/Projetos/LOPES FOCUS/tools/_emu3.log';
console.log('\n=== emu3.log (size: ' + (existsSync(log) ? readFileSync(log, 'utf8').length : 0) + ') ===');
if (existsSync(log)) {
  const t = readFileSync(log, 'utf8');
  console.log(t || '(vazio)');
}

// 4. Crash logs
import { readdirSync } from 'node:fs';
import path from 'node:path';
try {
  const files = readdirSync('A:/AI/sdk/android/emulator').filter(f => f.includes('crash') || f.includes('panic'));
  console.log('\n=== Crash files ===');
  files.forEach(f => console.log('  ' + f));
} catch (e) { console.log('crash dir erro: ' + e.message); }
