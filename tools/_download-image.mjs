import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const target = 'system-images;android-26;default;x86_64';
console.log('Baixando ' + target + '...');
console.log('(pode demorar 1-5 min dependendo da banda)');

const p = spawn('cmd', ['/c', 'A:\\AI\\sdk\\android\\cmdline-tools\\latest\\bin\\sdkmanager.bat', target], { shell: false });
p.stdout.on('data', d => process.stdout.write(d));
p.stderr.on('data', d => process.stderr.write(d));
p.on('close', (code) => {
  console.log('\n=== Download terminou (exit ' + code + ') ===');
});
