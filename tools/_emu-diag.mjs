// Diagnostico final do emulador
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

console.log('=== tasklist ===');
try {
  const out = execSync('cmd /c tasklist', { encoding: 'utf8' });
  const lines = out.split(/\r?\n/).filter(l => /emulator|qemu|adb/i.test(l));
  if (lines.length === 0) console.log('Nenhum processo emulator/qemu/adb');
  lines.forEach(l => console.log('  ' + l.trim()));
} catch (e) { console.log('tasklist erro: ' + e.message); }

console.log('\n=== AVDs disponiveis ===');
try {
  const out = execSync('cmd /c "A:\\AI\\sdk\\android\\emulator\\emulator.exe -list-avds"', { encoding: 'utf8' });
  console.log(out);
} catch (e) { console.log('list-avds erro: ' + e.message); }

console.log('\n=== Crash logs ===');
try {
  const files = readdirSync('A:/AI/sdk/android/emulator').filter(f => /crash|panic|kpanic/i.test(f));
  files.forEach(f => {
    const p = path.join('A:/AI/sdk/android/emulator', f);
    const s = statSync(p);
    console.log('  ' + f + ' (' + (s.size/1024).toFixed(1) + ' KB, mtime=' + s.mtime.toISOString().substring(0,19) + ')');
    if (f.endsWith('.log') || f.endsWith('.txt')) {
      const t = readFileSync(p, 'utf8');
      console.log('    --- conteudo (primeiras 30 linhas) ---');
      console.log(t.split(/\r?\n/).slice(0, 30).join('\n'));
    }
  });
} catch (e) { console.log('crash dir erro: ' + e.message); }

console.log('\n=== AVD configs ===');
for (const avd of ['AI_API35', 'GestorArm']) {
  const ini = path.join('A:/AI/sdk/android/avd', avd + '.ini');
  if (existsSync(ini)) {
    console.log('  ' + avd + ': ' + readFileSync(ini, 'utf8').replace(/\r?\n/g, ', '));
  }
}
