// Mata TUDO e sobe UM emulador novo
import { execSync, spawn } from 'node:child_process';

console.log('=== Matando TUDO relacionado a emulador ===');
const procs = ['emulator.exe', 'qemu-system-x86_64.exe', 'qemu-system-x86_64-headle', 'adb.exe', 'hostapd.exe', 'qemu-system-x86_64-headless.exe'];
for (const p of procs) {
  try { execSync(`cmd /c taskkill /F /IM "${p}" 2>nul`, { encoding: 'utf8' }); } catch (e) {}
}
console.log('Limpos.');

await new Promise(r => setTimeout(r, 5000));

console.log('\n=== Subindo AI_API35 com -read-only ===');
try {
  execSync('cmd /c start "AI_API35" /MIN "A:\\AI\\sdk\\android\\emulator\\emulator.exe" -avd AI_API35 -no-snapshot -no-audio -no-boot-anim -no-window -read-only -gpu swiftshader_indirect -memory 2048 -cores 4', { encoding: 'utf8' });
  console.log('Iniciado.');
} catch (e) { console.log('start erro: ' + e.message); }

console.log('Aguardando 90s...');
for (let i = 0; i < 18; i++) {
  await new Promise(r => setTimeout(r, 5000));
  let devs = '';
  try { devs = execSync('cmd /c "A:\\AI\\sdk\\android\\platform-tools\\adb.exe" devices', { encoding: 'utf8' }); } catch (e) {}
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] ${devs.replace(/\r/g, '').trim()}`);
  if (devs.includes('emulator-') && !devs.includes('offline')) {
    console.log('=== ONLINE ===');
    break;
  }
}
