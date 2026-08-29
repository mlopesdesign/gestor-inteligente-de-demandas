// Reabre Studio, espera Sync, verifica daemon
import { execSync, spawn } from 'node:child_process';
import { existsSync, statSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

console.log('=== ANTES ===');
console.log('gradle.properties global: ' + readFileSync('C:/Users/mlope/.gradle/gradle.properties', 'utf8').trim());
console.log('config.properties projeto: ' + readFileSync('E:/Projetos/LOPES FOCUS/android-app/.gradle/config.properties', 'utf8').trim());

console.log('\n=== Reabrindo Studio ===');
try {
  execSync('cmd /c start "" "A:\\AI\\tools\\AndroidStudio\\bin\\studio64.exe"', { encoding: 'utf8' });
  console.log('Studio aberto. Aguardando 75s...');
} catch (e) {
  console.log('start erro: ' + e.message);
  process.exit(1);
}

await new Promise(r => setTimeout(r, 75000));

console.log('\n=== Verificando daemon Gradle ===');
const daemonDir = 'C:/Users/mlope/.gradle/daemon/8.10.2';
if (existsSync(daemonDir)) {
  const files = readdirSync(daemonDir).filter(f => f.endsWith('.out.log'));
  const withTime = files.map(f => ({ f, t: statSync(path.join(daemonDir, f)).mtimeMs }));
  withTime.sort((a, b) => b.t - a.t);
  console.log('Total daemons: ' + withTime.length);
  console.log('\n--- Mais recentes (3) ---');
  for (const x of withTime.slice(0, 3)) {
    const txt = readFileSync(path.join(daemonDir, x.f), 'utf8');
    const startLine = txt.split(/\r?\n/).find(l => l.includes('start() called on daemon'));
    console.log(new Date(x.t).toISOString() + ' | ' + x.f);
    if (startLine) {
      const jhMatch = startLine.match(/javaHome=([^,]+)/);
      const jvMatch = startLine.match(/javaVersion=([^,]+)/);
      const jvMatch2 = startLine.match(/,javaVersion=([^,]+)/);
      if (jhMatch) console.log('  javaHome: ' + jhMatch[1]);
      if (jvMatch) console.log('  javaVersion: ' + jvMatch[1]);
    }
  }
}
