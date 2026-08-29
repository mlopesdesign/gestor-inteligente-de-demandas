import { execSync, spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
try { execSync('cmd /c taskkill /F /IM emulator.exe & taskkill /F /IM qemu-system-x86_64.exe & taskkill /F /IM qemu-system-x86_64-headle & taskkill /F /IM hostapd.exe', { encoding: 'utf8' }); } catch (e) {}
await new Promise(r => setTimeout(r, 3000));

console.log('Rodando emu em foreground por 45s...');
const p = spawn('cmd', ['/c', 'A:\\AI\\sdk\\android\\emulator\\emulator.exe', '-avd', 'GestorLight', '-no-snapshot', '-no-audio', '-no-boot-anim', '-no-window', '-accel', 'off', '-gpu', 'swiftshader_indirect', '-memory', '1024', '-cores', '2', '-verbose'], { shell: false });
let out = '';
p.stdout.on('data', d => out += d);
p.stderr.on('data', d => out += d);
const killTimer = setTimeout(() => { try { execSync('cmd /c taskkill /F /IM emulator.exe & taskkill /F /IM qemu-system-x86_64.exe & taskkill /F /IM qemu-system-x86_64-headle & taskkill /F /IM hostapd.exe', { encoding: 'utf8' }); } catch (e) {} }, 45000);
p.on('close', () => {
  clearTimeout(killTimer);
  writeFileSync('E:/Projetos/LOPES FOCUS/tools/_emu-light-fg.log', out, 'utf8');
  console.log('=== log salvo, ' + out.length + ' bytes ===');
});
await new Promise(r => setTimeout(r, 50000));
