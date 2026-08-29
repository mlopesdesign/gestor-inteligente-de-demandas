// Espera 6 min pelo emulador subir (TCG puro)
import { execSync } from 'node:child_process';

const adb = 'A:/AI/sdk/android/platform-tools/adb.exe';
const logPath = 'E:/Projetos/LOPES FOCUS/tools/_emu-wait-final.log';
const lines = [];
lines.push('=== Aguardando 6 min pelo emulador AI_API35 (TCG puro) ===');

for (let i = 0; i < 36; i++) { // 36 * 10s = 6 min
  await new Promise(r => setTimeout(r, 10000));
  let devices = '';
  try {
    devices = execSync(`cmd /c "${adb}" devices`, { encoding: 'utf8' });
  } catch (e) {
    devices = 'erro: ' + e.message;
  }
  // Verifica processos
  let procs = '';
  try {
    const out = execSync('cmd /c tasklist', { encoding: 'utf8' });
    const ps = out.split(/\r?\n/).filter(l => /emulator\.exe|qemu/i.test(l));
    procs = ps.length > 0 ? ps.map(l => l.split(/\s+/)[0]).join(',') : '(nenhum)';
  } catch (e) {}
  const ts = new Date().toISOString().substring(11, 19);
  const line = `[${ts}] procs=${procs} | ${devices.replace(/\r/g, '').trim()}`;
  console.log(line);
  lines.push(line);
  // Se subiu (device sem offline)
  if (devices.includes('emulator-') && !devices.includes('offline')) {
    lines.push('=== ONLINE ===');
    console.log('=== ONLINE ===');
    break;
  }
}
require('fs').writeFileSync(logPath, lines.join('\n'), 'utf8');
console.log('\nLog salvo em ' + logPath);
