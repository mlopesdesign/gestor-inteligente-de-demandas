// Verifica estado REAL do emulador e do Hyper-V
import { execSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

console.log('=== 1. Status do Hyper-V (DISM) ===');
try {
  const o1 = execSync('powershell -Command "Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -ErrorAction SilentlyContinue | Select-Object FeatureName,State,RestartNeeded | Format-List"', { encoding: 'utf8' });
  console.log('Microsoft-Hyper-V:');
  console.log(o1);
} catch (e) { console.log('Hyper-V erro: ' + e.message); }

try {
  const o2 = execSync('powershell -Command "Get-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -ErrorAction SilentlyContinue | Select-Object FeatureName,State,RestartNeeded | Format-List"', { encoding: 'utf8' });
  console.log('HypervisorPlatform:');
  console.log(o2);
} catch (e) { console.log('HypervisorPlatform erro: ' + e.message); }

console.log('\n=== 2. bcdedit hypervisorlaunchtype ===');
try {
  const o = execSync('cmd /c bcdedit /enum {default} | findstr hypervisorlaunchtype', { encoding: 'utf8' });
  console.log(o.trim() || '(vazio)');
} catch (e) { console.log('bcdedit erro: ' + e.message); }

console.log('\n=== 3. servicos relacionados ===');
try {
  const o = execSync('cmd /c sc query "vmcompute" 2>&1 & sc query "hvboot" 2>&1', { encoding: 'utf8' });
  console.log(o);
} catch (e) { console.log('sc erro: ' + e.message); }

console.log('\n=== 4. Emulacao Aceleração (WHPX) ===');
try {
  const o = execSync('powershell -Command "(Get-CimInstance Win32_Processor).VirtualizationFirmwareEnabled"', { encoding: 'utf8' });
  console.log('VT-x no firmware: ' + o.trim());
} catch (e) { console.log('VT-x erro: ' + e.message); }

console.log('\n=== 5. AVDs disponiveis ===');
try {
  const o = execSync('cmd /c "A:\\AI\\sdk\\android\\emulator\\emulator.exe -list-avds"', { encoding: 'utf8' });
  console.log(o);
} catch (e) { console.log('list-avds: ' + e.message); }

console.log('\n=== 6. Aceleracao disponivel no emulador ===');
try {
  const o = execSync('cmd /c "A:\\AI\\sdk\\android\\emulator\\emulator.exe -accel-check"', { encoding: 'utf8' });
  console.log(o);
} catch (e) { console.log('accel-check: ' + e.message); }

console.log('\n=== 7. adb devices (estado atual) ===');
try {
  const o = execSync('cmd /c "A:\\AI\\sdk\\android\\platform-tools\\adb.exe devices"', { encoding: 'utf8' });
  console.log(o);
} catch (e) { console.log('adb erro: ' + e.message); }
