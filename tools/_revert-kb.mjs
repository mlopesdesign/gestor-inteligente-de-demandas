import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const p = 'A:/AI/sdk/android/avd/AI_API35.avd/hardware-qemu.ini';
let txt = readFileSync(p, 'utf8');
if (txt.includes('hw.keyboard = true')) {
  txt = txt.replace('hw.keyboard = true', 'hw.keyboard = false');
  writeFileSync(p, txt, 'utf8');
  console.log('Revertido hw.keyboard=true -> false');
}
console.log('Matando crash...');
for (const p of ['emulator.exe', 'qemu-system-x86_64.exe', 'qemu-system-x86_64-headle', 'qemu-system-x86_64-headless.exe', 'hostapd.exe']) {
  try { execSync(`cmd /c taskkill /F /IM "${p}" 2>nul`, { encoding: 'utf8' }); } catch (e) {}
}
console.log('OK');
