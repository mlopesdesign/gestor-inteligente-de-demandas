import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

// 1. hw.keyboard=true
const p = 'A:/AI/sdk/android/avd/AI_API35.avd/hardware-qemu.ini';
let txt = readFileSync(p, 'utf8');
if (txt.includes('hw.keyboard = false')) {
  txt = txt.replace('hw.keyboard = false', 'hw.keyboard = true');
  writeFileSync(p, txt, 'utf8');
  console.log('hw.keyboard=false -> true');
}

// 2. Matar
console.log('Matando...');
for (const x of ['emulator.exe', 'qemu-system-x86_64.exe', 'qemu-system-x86_64-headle', 'qemu-system-x86_64-headless.exe', 'hostapd.exe', 'adb.exe']) {
  try { execSync(`cmd /c taskkill /F /IM "${x}" 2>nul`, { encoding: 'utf8' }); } catch (e) {}
}
await new Promise(r => setTimeout(r, 5000));

// 3. Subir
console.log('Subindo com hw.keyboard=true e swiftshader...');
try {
  execSync('cmd /c start "AI_API35-kb" /MIN "A:\\AI\\sdk\\android\\emulator\\emulator.exe" -avd AI_API35 -no-snapshot -no-audio -no-boot-anim -accel off -gpu swiftshader_indirect -memory 2048 -cores 4 -no-window', { encoding: 'utf8' });
  console.log('Iniciado.');
} catch (e) { console.log('start erro: ' + e.message); }

// 4. Esperar 5 min
const adb = 'A:/AI/sdk/android/platform-tools/adb.exe';
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 10000));
  let d = '';
  try { d = execSync('cmd /c "' + adb + '" devices', { encoding: 'utf8' }); } catch (e) {}
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] ${d.replace(/\r/g, '').trim()}`);
  if (d.includes('emulator-') && !d.includes('offline')) {
    console.log('=== ONLINE ===');
    // Tenta instalar APK
    const apk = 'E:/Projetos/LOPES FOCUS/android-app/app/build/outputs/apk/debug/app-debug.apk';
    try {
      const r = execSync(`cmd /c "${adb}" install -r -t "${apk}"`, { encoding: 'utf8' });
      console.log('install: ' + r);
    } catch (e) { console.log('install: ' + e.message); }
    break;
  }
}
