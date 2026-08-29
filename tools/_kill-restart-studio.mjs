// Mata daemon + Studio, reabre Studio, espera Sync, verifica
import { execSync, spawn } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const log = [];

// 1. Matar todos os daemons Gradle
console.log('=== Matando daemons Gradle ===');
try {
  const out = execSync('cmd /c "taskkill /F /IM java.exe /FI \\"WINDOWTITLE eq Gradle*\\""', { encoding: 'utf8', stdio: 'pipe' });
  log.push('taskkill java: ' + out);
} catch (e) { log.push('taskkill java: ' + e.message.split('\n')[0]); }
// Tambem tenta gradle-wrapper
try {
  const out = execSync('cmd /c taskkill /F /IM gradle-wrapper.exe 2>nul & cmd /c taskkill /F /IM gradle-launcher.exe 2>nul', { encoding: 'utf8' });
} catch (e) {}
// Tenta via gradlew --stop
try {
  const p = spawn('cmd', ['/c', 'gradlew.bat', '--stop'], { cwd: 'E:/Projetos/LOPES FOCUS/android-app', shell: false });
  await new Promise(r => { p.on('close', r); setTimeout(r, 10000); });
  log.push('gradlew --stop executado');
} catch (e) { log.push('gradlew --stop: ' + e.message); }

// 2. Matar Studio
console.log('\n=== Matando studio64.exe ===');
try {
  const out = execSync('cmd /c taskkill /F /IM studio64.exe', { encoding: 'utf8' });
  log.push('taskkill studio: ' + out.trim());
} catch (e) { log.push('taskkill studio: ' + e.message.split('\n')[0]); }

console.log('Aguardando 8s...');
await new Promise(r => setTimeout(r, 8000));

// 3. Listar daemons restantes
console.log('\n=== Daemons restantes ===');
const daemonDir = 'C:/Users/mlope/.gradle/daemon/8.10.2';
if (existsSync(daemonDir)) {
  const files = readdirSync(daemonDir).filter(f => f.endsWith('.out.log'));
  const withTime = files.map(f => ({ f, t: statSync(path.join(daemonDir, f)).mtimeMs }));
  withTime.sort((a, b) => b.t - a.t);
  console.log('Total: ' + withTime.length);
}

// 4. Reabrir Studio
console.log('\n=== Reabrindo Android Studio ===');
try {
  execSync('cmd /c start "" "A:\\AI\\tools\\AndroidStudio\\bin\\studio64.exe"', { encoding: 'utf8' });
  log.push('Studio iniciado');
  console.log('Studio iniciado.');
} catch (e) {
  log.push('start studio: ' + e.message);
  console.log('start erro: ' + e.message);
}

console.log('\n=== Aguardando 90s pro Studio inicializar e Sync rodar ===');
await new Promise(r => setTimeout(r, 90000));

// 5. Verificar daemons NOVOS (criados AGORA)
console.log('\n=== Daemons mais recentes (depois do restart) ===');
if (existsSync(daemonDir)) {
  const files = readdirSync(daemonDir).filter(f => f.endsWith('.out.log'));
  const withTime = files.map(f => ({ f, t: statSync(path.join(daemonDir, f)).mtimeMs }));
  withTime.sort((a, b) => b.t - a.t);
  for (const x of withTime.slice(0, 3)) {
    const txt = readFileSync(path.join(daemonDir, x.f), 'utf8');
    const startLine = txt.split(/\r?\n/).find(l => l.includes('start() called on daemon'));
    console.log(new Date(x.t).toISOString() + ' | ' + x.f);
    if (startLine) {
      const jhMatch = startLine.match(/javaHome=([^,]+)/);
      const jvMatch = startLine.match(/javaVersion=([^,]+)/);
      if (jhMatch) console.log('  javaHome: ' + jhMatch[1]);
      if (jvMatch) console.log('  javaVersion: ' + jvMatch[1]);
    }
  }
}

writeFileSync('E:/Projetos/LOPES FOCUS/tools/_restart-studio.log', log.join('\n'), 'utf8');
