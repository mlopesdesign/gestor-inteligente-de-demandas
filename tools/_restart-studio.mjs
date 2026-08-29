// Reinicia o Android Studio forcado
import { execSync, spawn } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync, statSync } from 'node:fs';

console.log('=== Matando studio64.exe ===');
try {
  const out = execSync('cmd /c taskkill /F /IM studio64.exe', { encoding: 'utf8' });
  console.log(out.trim());
} catch (e) {
  console.log('taskkill: ' + e.message);
}

console.log('\n=== Esperando 5s ===');
await new Promise(r => setTimeout(r, 5000));

console.log('\n=== Reabrindo Android Studio ===');
try {
  execSync('cmd /c start "" "A:\\AI\\tools\\AndroidStudio\\bin\\studio64.exe"', { encoding: 'utf8' });
  console.log('Studio iniciado em background.');
} catch (e) {
  console.log('start erro: ' + e.message);
}

console.log('\n=== Esperando 30s pro Studio inicializar ===');
await new Promise(r => setTimeout(r, 30000));

console.log('\n=== Verificando processo ===');
try {
  const out = execSync('cmd /c tasklist', { encoding: 'utf8' });
  const lines = out.split(/\r?\n/).filter(l => /studio64/i.test(l));
  if (lines.length === 0) {
    console.log('studio64 NAO encontrado');
  } else {
    lines.forEach(l => console.log('  ' + l.trim()));
  }
} catch (e) { console.log('tasklist erro: ' + e.message); }
