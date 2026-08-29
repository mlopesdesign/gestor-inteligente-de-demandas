import { execSync, spawn } from 'node:child_process';

// Mata TUDO
console.log('Matando...');
for (const p of ['emulator.exe', 'qemu-system-x86_64.exe', 'qemu-system-x86_64-headle', 'qemu-system-x86_64-headless.exe', 'hostapd.exe', 'adb.exe']) {
  try { execSync(`cmd /c taskkill /F /IM "${p}" 2>nul`, { encoding: 'utf8' }); } catch (e) {}
}
await new Promise(r => setTimeout(r, 5000));

console.log('Iniciando AI_API35 com hw.keyboard=true...');
try {
  execSync('cmd /c start "AI_API35-final" /MIN "A:\\AI\\sdk\\android\\emulator\\emulator.exe" -avd AI_API35 -no-snapshot -no-audio -no-boot-anim -accel off -gpu swiftshader_indirect -memory 2048 -cores 4', { encoding: 'utf8' });
  console.log('Iniciado.');
} catch (e) { console.log('start erro: ' + e.message); }

const adb = 'A:/AI/sdk/android/platform-tools/adb.exe';
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 10000));
  let d = '';
  try { d = execSync('cmd /c "' + adb + '" devices', { encoding: 'utf8' }); } catch (e) {}
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] ${d.replace(/\r/g, '').trim()}`);
  if (d.includes('emulator-') && !d.includes('offline')) {
    console.log('=== ONLINE — instalando APK ===');
    // Instala
    const apk = 'E:/Projetos/LOPES FOCUS/android-app/app/build/outputs/apk/debug/app-debug.apk';
    try {
      execSync(`cmd /c "${adb}" install -r -t "${apk}"`, { encoding: 'utf8' });
      console.log('APK instalado!');
    } catch (e) { console.log('install: ' + e.message); }
    break;
  }
}
