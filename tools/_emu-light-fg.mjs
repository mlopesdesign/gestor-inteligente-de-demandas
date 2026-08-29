import { execSync, spawn } from 'node:child_process';
try { execSync('cmd /c taskkill /F /IM emulator.exe & taskkill /F /IM qemu-system-x86_64.exe & taskkill /F /IM qemu-system-x86_64-headle & taskkill /F /IM hostapd.exe', { encoding: 'utf8' }); } catch (e) {}
await new Promise(r => setTimeout(r, 3000));

console.log('Rodando emu em foreground por 45s...');
const p = spawn('cmd', ['/c', 'A:\\AI\\sdk\\android\\emulator\\emulator.exe', '-avd', 'GestorLight', '-no-snapshot', '-no-audio', '-no-boot-anim', '-no-window', '-accel', 'off', '-gpu', 'swiftshader_indirect', '-memory', '1024', '-cores', '2', '-verbose'], { shell: false });
p.stdout.on('data', d => process.stdout.write(d));
p.stderr.on('data', d => process.stderr.write(d));
const killTimer = setTimeout(() => { console.log('=== timeout, matando ==='); try { execSync('cmd /c taskkill /F /IM emulator.exe & taskkill /F /IM qemu-system-x86_64.exe & taskkill /F /IM qemu-system-x86_64-headle & taskkill /F /IM hostapd.exe', { encoding: 'utf8' }); } catch (e) {} }, 45000);
p.on('close', () => { clearTimeout(killTimer); console.log('=== processo fechou ==='); });
