// Verifica o daemon Gradle mais recente (o que o Studio Sync usou)
import { readdirSync, statSync, readFileSync } from 'node:fs';
import path from 'node:path';

const daemonDir = 'C:/Users/mlope/.gradle/daemon/8.10.2';
const files = readdirSync(daemonDir).filter(f => f.endsWith('.out.log'));
const sorted = files.map(f => {
  const p = path.join(daemonDir, f);
  return { file: p, mtime: statSync(p).mtimeMs, name: f };
}).sort((a, b) => b.mtimeMs - a.mtimeMs);

console.log('=== 5 DAEMONS MAIS RECENTES ===');
for (const x of sorted.slice(0, 5)) {
  console.log(new Date(x.mtime).toISOString() + ' | ' + x.name);
}

const latest = sorted[0];
console.log('\n=== CONTEUDO DO MAIS RECENTE ===');
const txt = readFileSync(latest.file, 'utf8');
// Pega as primeiras linhas até "Daemon will be stopped"
const lines = txt.split(/\r?\n/);
// Pega linha que tem javaHome
const javaHomeLine = lines.find(l => l.includes('javaHome='));
console.log('Linha javaHome: ' + (javaHomeLine || '(nao achou)'));
const javaVerLine = lines.find(l => l.includes('javaVersion='));
console.log('Linha javaVersion: ' + (javaVerLine || '(nao achou)'));
const daemonStart = lines.findIndex(l => l.includes('start() called on daemon'));
if (daemonStart > 0) {
  console.log('\nTrecho relevante:');
  console.log(lines[daemonStart].substring(0, 1000));
}
