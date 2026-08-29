import { execSync, spawn } from 'node:child_process';

console.log('=== Abrindo Studio ===');
try {
  execSync('cmd /c start "" "A:\\AI\\tools\\AndroidStudio\\bin\\studio64.exe"', { encoding: 'utf8' });
  console.log('Studio aberto.');
} catch (e) { console.log('start: ' + e.message); }

await new Promise(r => setTimeout(r, 60000));
console.log('Aguardando 60s pro Studio inicializar...');

console.log('\n=== Subindo AI_API35 ===');
try {
  execSync('cmd /c start "AI_API35" /MIN "A:\\AI\\sdk\\android\\emulator\\emulator.exe" -avd AI_API35 -no-snapshot -no-audio -no-boot-anim -accel off -gpu swiftshader_indirect -memory 2048 -cores 4 -no-window', { encoding: 'utf8' });
  console.log('Iniciado.');
} catch (e) { console.log('start: ' + e.message); }

const adb = 'A:/AI/sdk/android/platform-tools/adb.exe';
for (let i = 0; i < 36; i++) {
  await new Promise(r => setTimeout(r, 10000));
  let d = '';
  try { d = execSync('cmd /c "' + adb + '" devices', { encoding: 'utf8' }); } catch (e) {}
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] ${d.replace(/\r/g, '').trim()}`);
  if (d.includes('emulator-') && !d.includes('offline')) {
    console.log('=== ONLINE — instalando APK ===');
    const apk = 'E:/Projetos/LOPES FOCUS/android-app/app/build/outputs/apk/debug/app-debug.apk';
    try {
      const r = execSync(`cmd /c "${adb}" install -r -t "${apk}"`, { encoding: 'utf8' });
      console.log('install: ' + r);
    } catch (e) { console.log('install: ' + e.message); }
    break;
  }
}
