import { execSync } from 'node:child_process';
const adb = 'A:/AI/sdk/android/platform-tools/adb.exe';
for (let i = 0; i < 36; i++) {
  await new Promise(r => setTimeout(r, 10000));
  let devices = '';
  try { devices = execSync(`cmd /c "${adb}" devices`, { encoding: 'utf8' }); } catch (e) {}
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] ${devices.replace(/\r/g, '').trim()}`);
  if (devices.includes('emulator-') && !devices.includes('offline')) {
    console.log('=== ONLINE ===');
    break;
  }
}
