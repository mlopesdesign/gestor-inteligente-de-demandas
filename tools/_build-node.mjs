// Build via node spawn
import { spawn } from 'node:child_process';
import { writeFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const projectPath = 'E:/Projetos/LOPES FOCUS/android-app';
const logPath = 'E:/Projetos/LOPES FOCUS/tools/_build-real.log';
const log = [];

// Mata daemon primeiro
await new Promise((resolve) => {
  const p = spawn('cmd', ['/c', 'gradlew.bat', '--stop'], { cwd: projectPath, shell: false });
  p.on('close', () => resolve());
  setTimeout(resolve, 15000);
});
log.push('=== STOP done ===');

// Build
console.log('Building...');
await new Promise((resolve, reject) => {
  const p = spawn('cmd', ['/c', 'gradlew.bat', '--no-daemon', 'assembleDebug'], { cwd: projectPath, shell: false });
  p.stdout.on('data', d => log.push(d.toString()));
  p.stderr.on('data', d => log.push('STDERR: ' + d.toString()));
  p.on('close', (code) => {
    log.push('EXITCODE=' + code);
    resolve();
  });
});

writeFileSync(logPath, log.join(''), 'utf8');

// Resumo
const fullLog = log.join('');
const status = (fullLog.match(/BUILD (SUCCESSFUL|FAILED) in (\S+)/) || []);
const launcher = (fullLog.match(/Launcher JVM:\s+([^\r\n]+)/) || [])[1];
const daemon = (fullLog.match(/Daemon JVM:\s+([^\r\n]+)/) || [])[1];
console.log('STATUS: ' + (status[1] || '(sem)'));
console.log('TEMPO: ' + (status[2] || '?'));
if (launcher) console.log('Launcher JVM: ' + launcher);
if (daemon) console.log('Daemon JVM: ' + daemon);
const apk = path.join(projectPath, 'app/build/outputs/apk/debug/app-debug.apk');
if (existsSync(apk)) {
  const s = statSync(apk);
  console.log('APK: ' + (s.size/1024/1024).toFixed(2) + ' MB, mtime=' + s.mtime.toISOString().substring(0,19));
}
if (status[1] === 'FAILED') {
  console.log('--- ULTIMAS 30 LINHAS ---');
  console.log(fullLog.split(/\r?\n/).slice(-30).join('\n'));
}
