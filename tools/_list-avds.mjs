import { readdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

console.log('=== System images disponiveis ===');
const sdk = 'A:/AI/sdk/android/system-images';
if (existsSync(sdk)) {
  function walk(d, depth=0) {
    if (depth > 3) return;
    try {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) {
          console.log('  '.repeat(depth) + e.name);
          walk(p, depth + 1);
        }
      }
    } catch (e) {}
  }
  walk(sdk);
}

console.log('\n=== AVDs ===');
try {
  const out = execSync('cmd /c "A:\\AI\\sdk\\android\\emulator\\emulator.exe -list-avds"', { encoding: 'utf8' });
  console.log(out);
} catch (e) { console.log('list: ' + e.message); }
