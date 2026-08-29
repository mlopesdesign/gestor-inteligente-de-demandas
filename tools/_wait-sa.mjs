import { execSync } from 'node:child_process';
const adb = 'A:/AI/sdk/android/platform-tools/adb.exe';
for (let i = 0; i < 60; i++) { // 10 min
  await new Promise(r => setTimeout(r, 10000));
  let d = '';
  try { d = execSync('cmd /c "' + adb + '" devices', { encoding: 'utf8' }); } catch (e) {}
  const ts = new Date().toISOString().substring(11, 19);
  // Verifica processo
  let procs = '';
  try {
    const o = execSync('cmd /c tasklist', { encoding: 'utf8' });
    const ps = o.split(/\r?\n/).filter(l => /emulator\.exe|qemu/i.test(l));
    procs = ps.length > 0 ? ps.map(l => l.split(/\s+/)[0]).join(',') : '(nenhum)';
  } catch (e) {}
  console.log(`[${ts}] procs=${procs} | ${d.replace(/\r/g, '').trim()}`);
  if (d.includes('emulator-') && !d.includes('offline')) {
    console.log('=== ONLINE ===');
    break;
  }
}
