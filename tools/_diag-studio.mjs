// Identifica o studio64.exe
import { execSync } from 'node:child_process';

const out = execSync('cmd /c tasklist', { encoding: 'utf8' });
const lines = out.split(/\r?\n/).filter(l => /studio|idea/i.test(l));
console.log('=== processos studio/idea ===');
if (lines.length === 0) console.log('Nenhum');
lines.forEach(l => console.log('  ' + l.trim()));

// Procura caminho do studio64.exe
console.log('\n=== Procurando studio64.exe ===');
const paths = [
  'A:/AI/tools/AndroidStudio/bin/studio64.exe',
  'C:/Program Files/Android Studio/bin/studio64.exe',
  'A:/AI/IntelliJ/bin/idea64.exe',
];
import { existsSync } from 'node:fs';
for (const p of paths) {
  console.log((existsSync(p) ? 'EXISTE' : 'nao') + ' ' + p);
}
