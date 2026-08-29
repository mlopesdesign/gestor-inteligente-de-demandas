import { execSync } from 'node:child_process';
console.log('=== ANTES ===');
try { const o = execSync('cmd /c tasklist', { encoding: 'utf8' }); console.log(o.split(/\r?\n/).filter(l => /emulator|qemu|hostapd|adb/i.test(l)).join('\n')); } catch (e) {}

// Mata TUDO
console.log('\n=== Matando ===');
for (const p of ['emulator.exe', 'qemu-system-x86_64.exe', 'qemu-system-x86_64-headle', 'qemu-system-x86_64-headless.exe', 'hostapd.exe', 'adb.exe']) {
  try { execSync(`cmd /c taskkill /F /IM "${p}" 2>nul`, { encoding: 'utf8' }); console.log('matou ' + p); } catch (e) {}
}

await new Promise(r => setTimeout(r, 5000));

console.log('\n=== DEPOIS ===');
try { const o = execSync('cmd /c tasklist', { encoding: 'utf8' }); const ps = o.split(/\r?\n/).filter(l => /emulator|qemu|hostapd|adb/i.test(l)); console.log(ps.length === 0 ? '(nenhum)' : ps.join('\n')); } catch (e) {}

// adb devices
try { const o = execSync('cmd /c "A:\\AI\\sdk\\android\\platform-tools\\adb.exe" devices', { encoding: 'utf8' }); console.log('\nadb: ' + o); } catch (e) {}
