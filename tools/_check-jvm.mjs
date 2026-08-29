// Verifica JVM
import { spawn } from 'node:child_process';

const projectPath = 'E:/Projetos/LOPES FOCUS/android-app';
let out = '';
await new Promise((resolve) => {
  const p = spawn('cmd', ['/c', 'gradlew.bat', '--version'], { cwd: projectPath, shell: false });
  p.stdout.on('data', d => out += d.toString());
  p.stderr.on('data', d => out += d.toString());
  p.on('close', () => resolve());
});
console.log(out);
