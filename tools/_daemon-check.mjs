// Investiga o daemon Gradle mais recente
import { readdirSync, statSync, readFileSync } from 'node:fs';
import path from 'node:path';

const daemonDir = 'C:/Users/mlope/.gradle/daemon/8.10.2';
const files = readdirSync(daemonDir).filter(f => f.endsWith('.out.log'));
const sorted = files.map(f => {
  const p = path.join(daemonDir, f);
  return { file: p, mtime: statSync(p).mtimeMs };
}).sort((a, b) => b.mtimeMs - a.mtimeMs);

console.log('=== Ultimos 5 daemons (mais recente primeiro) ===');
for (const x of sorted.slice(0, 5)) {
  console.log(new Date(x.mtime).toISOString() + ' | ' + x.file);
}

console.log('\n=== Conteudo do daemon MAIS RECENTE (primeiras 60 linhas) ===');
const latest = sorted[0].file;
const txt = readFileSync(latest, 'utf8');
console.log('Tamanho: ' + txt.length);
console.log('---');
console.log(txt.split(/\r?\n/).slice(0, 60).join('\n'));
console.log('---');
console.log('ULTIMAS 30 LINHAS:');
console.log(txt.split(/\r?\n/).slice(-30).join('\n'));
