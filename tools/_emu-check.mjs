import { readdirSync, statSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const emuDir = 'A:/AI/sdk/android/emulator';
const files = readdirSync(emuDir);
const logs = files.filter(f => f.toLowerCase().includes('log') || f.toLowerCase().includes('crash') || f.toLowerCase().includes('error'));
console.log('Logs/erros no dir do emulador:');
logs.forEach(f => {
  const p = path.join(emuDir, f);
  const s = statSync(p);
  console.log('  ' + f + ' (' + (s.size/1024).toFixed(1) + ' KB, mtime=' + s.mtime.toISOString().substring(0,19) + ')');
});

console.log('');
console.log('=== Processos emulator/qemu ainda rodando ===');
try {
  const out = execSync('cmd /c tasklist', { encoding: 'utf8' });
  const lines = out.split(/\r?\n/).filter(l => /emulator|qemu/i.test(l));
  if (lines.length === 0) console.log('Nenhum processo emulator/qemu rodando');
  lines.forEach(l => console.log('  ' + l.trim()));
} catch (e) { console.log('tasklist erro: ' + e.message); }

console.log('');
console.log('=== emu.log (capturado) ===');
const log = 'E:/Projetos/LOPES FOCUS/tools/_emu.log';
try { console.log(readFileSync(log, 'utf8')); } catch { console.log('(vazio ou não existe)'); }
