// Clean + build real
import { spawn } from 'node:child_process';
import { writeFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const projectPath = 'E:/Projetos/LOPES FOCUS/android-app';
const logPath = 'E:/Projetos/LOPES FOCUS/tools/_clean-build.log';
const log = [];

console.log('--- STOP daemon ---');
await new Promise((resolve) => {
  const p = spawn('cmd', ['/c', 'gradlew.bat', '--stop'], { cwd: projectPath, shell: false });
  p.on('close', () => resolve());
  setTimeout(resolve, 10000);
});
log.push('=== STOP OK ===');

console.log('--- CLEAN ---');
await new Promise((resolve) => {
  const p = spawn('cmd', ['/c', 'gradlew.bat', '--no-daemon', 'clean'], { cwd: projectPath, shell: false });
  p.stdout.on('data', d => log.push(d.toString()));
  p.stderr.on('data', d => log.push('STDERR: ' + d.toString()));
  p.on('close', (code) => { log.push('CLEAN_EXIT=' + code); resolve(); });
});

console.log('--- ASSEMBLE DEBUG ---');
await new Promise((resolve) => {
  const p = spawn('cmd', ['/c', 'gradlew.bat', '--no-daemon', 'assembleDebug'], { cwd: projectPath, shell: false });
  p.stdout.on('data', d => log.push(d.toString()));
  p.stderr.on('data', d => log.push('STDERR: ' + d.toString()));
  p.on('close', (code) => { log.push('BUILD_EXIT=' + code); resolve(); });
});

writeFileSync(logPath, log.join(''), 'utf8');
const full = log.join('');
const status = (full.match(/BUILD (SUCCESSFUL|FAILED) in (\S+)/) || []);
console.log('STATUS: ' + (status[1] || '(sem)'));
console.log('TEMPO: ' + (status[2] || '?'));
const apk = path.join(projectPath, 'app/build/outputs/apk/debug/app-debug.apk');
if (existsSync(apk)) {
  const s = statSync(apk);
  console.log('APK: ' + (s.size/1024/1024).toFixed(2) + ' MB, mtime=' + s.mtime.toISOString().substring(0,19));
}
if (status[1] === 'FAILED') {
  console.log('--- ERRO (ultimas 40) ---');
  console.log(full.split(/\r?\n/).slice(-40).join('\n'));
}
