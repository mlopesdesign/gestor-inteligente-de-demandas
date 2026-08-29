// Para daemon Gradle
import { spawn } from 'node:child_process';
const projectPath = 'E:/Projetos/LOPES FOCUS/android-app';
await new Promise((resolve) => {
  const p = spawn('cmd', ['/c', 'gradlew.bat', '--stop'], { cwd: projectPath, shell: false });
  p.stdout.on('data', d => process.stdout.write(d));
  p.on('close', () => resolve());
  setTimeout(resolve, 15000);
});
console.log('Daemon parado.');
