// Habilita hw.keyboard=true no AI_API35
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'A:/AI/sdk/android/avd/AI_API35.avd/hardware-qemu.ini';
let txt = readFileSync(p, 'utf8');
console.log('=== ANTES ===');
console.log(txt.split(/\r?\n/).filter(l => l.includes('keyboard')).join('\n'));

if (txt.includes('hw.keyboard = false')) {
  txt = txt.replace('hw.keyboard = false', 'hw.keyboard = true');
  writeFileSync(p, txt, 'utf8');
  console.log('\n=== hw.keyboard: false -> true ===');
} else {
  console.log('\nja estava true ou formato diferente');
}
console.log('\n=== DEPOIS ===');
console.log(readFileSync(p, 'utf8').split(/\r?\n/).filter(l => l.includes('keyboard')).join('\n'));
