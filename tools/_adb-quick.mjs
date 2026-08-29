import { execSync } from 'node:child_process';
try {
  const o = execSync('cmd /c "A:\\AI\\sdk\\android\\platform-tools\\adb.exe" devices', { encoding: 'utf8' });
  console.log(o);
} catch (e) { console.log('erro: ' + e.message); }
