import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'path';

// Cria AVD com system image Android 26 (leve)
const avdName = 'GestorLight';
const avdId = 'gestor_light';

console.log('Criando AVD ' + avdName + '...');
try {
  const out = execSync(`cmd /c echo no | "A:\\AI\\sdk\\android\\cmdline-tools\\latest\\bin\\avdmanager.bat" create avd -n ${avdName} -k "system-images;android-26;default;x86_64" -d pixel_5 --force`, { encoding: 'utf8', shell: true });
  console.log(out);
} catch (e) {
  console.log('create: ' + e.message.split('\n').slice(0, 5).join('\n'));
}

// Verifica AVD
console.log('\n=== AVDs ===');
try {
  const out = execSync('cmd /c "A:\\AI\\sdk\\android\\emulator\\emulator.exe -list-avds"', { encoding: 'utf8' });
  console.log(out);
} catch (e) { console.log('list: ' + e.message); }
