// Reabre Studio e espera 90s
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';

console.log('=== ANTES ===');
console.log('JAVA_HOME (Node): ' + (process.env.JAVA_HOME || 'vazio'));
console.log('config.properties:');
console.log(readFileSync('E:/Projetos/LOPES FOCUS/android-app/.gradle/config.properties', 'utf8'));

console.log('\n=== Reabrindo Studio ===');
try {
  execSync('cmd /c start "" "A:\\AI\\tools\\AndroidStudio\\bin\\studio64.exe"', { encoding: 'utf8' });
  console.log('Studio aberto. Aguardando 90s pra Sync rodar...');
} catch (e) {
  console.log('start erro: ' + e.message);
}

await new Promise(r => setTimeout(r, 90000));

console.log('\n=== APOS 90s ===');
const daemonDir = 'C:/Users/mlope/.gradle/daemon/8.10.2';
if (existsSync(daemonDir)) {
  const files = readdirSync(daemonDir).filter(f => f.endsWith('.out.log'));
  const withTime = files.map(f => ({ f, t: statSync(path.join(daemonDir, f)).mtimeMs }));
  withTime.sort((a, b) => b.t - a.t);
  console.log('Total daemons: ' + withTime.length);
  for (const x of withTime.slice(0, 3)) {
    const txt = readFileSync(path.join(daemonDir, x.f), 'utf8');
    const startLine = txt.split(/\r?\n/).find(l => l.includes('start() called on daemon'));
    console.log(new Date(x.t).toISOString() + ' | ' + x.f);
    if (startLine) {
      const jhMatch = startLine.match(/javaHome=([^,]+)/);
      const jvMatch = startLine.match(/javaVersion=([^,]+)/);
      const pidMatch = startLine.match(/pid=(\d+)/);
      if (jhMatch) console.log('  javaHome: ' + jhMatch[1]);
      if (jvMatch) console.log('  javaVersion: ' + jvMatch[1]);
      if (pidMatch) console.log('  pid: ' + pidMatch[1]);
    }
  }
}
