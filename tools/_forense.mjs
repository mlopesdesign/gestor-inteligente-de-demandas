// FORENSE: fechar Studio, listar versao, todos os dirs de config, busca recursiva
import { execSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

console.log('=== 1. FECHAR Android Studio ===');
try {
  const out = execSync('cmd /c taskkill /F /IM studio64.exe', { encoding: 'utf8' });
  console.log(out.trim());
} catch (e) {
  console.log('taskkill: ' + e.message.split('\n')[0]);
}

console.log('\n=== 2. Esperar 3s ===');
await new Promise(r => setTimeout(r, 3000));

console.log('\n=== 3. Identificar caminho do Android Studio ===');
const candidates = [
  'A:/AI/tools/AndroidStudio',
  'C:/Program Files/Android Studio',
  'C:/Program Files/Google/Android Studio',
  'A:/AI/AndroidStudio',
  'A:/AI/jetbrains/AndroidStudio',
];
for (const c of candidates) {
  if (existsSync(c)) {
    console.log('EXISTE: ' + c);
    // Tenta achar build.txt
    const build = path.join(c, 'build.txt');
    if (existsSync(build)) {
      console.log('  build.txt: ' + readFileSync(build, 'utf8').trim());
    }
    const product = path.join(c, 'product-info.json');
    if (existsSync(product)) {
      try {
        const info = JSON.parse(readFileSync(product, 'utf8'));
        console.log('  product: ' + (info.name || '?') + ' ' + (info.version || '?') + ' build ' + (info.buildNumber || '?'));
      } catch (e) {}
    }
    const ver = path.join(c, 'Installations', 'platform', 'build.txt');
    if (existsSync(ver)) {
      console.log('  platform/build.txt: ' + readFileSync(ver, 'utf8').trim());
    }
  }
}

console.log('\n=== 4. Versao via registro do Windows (se existir) ===');
try {
  const out = execSync('powershell -Command "Get-ItemProperty \'HKLM:\\SOFTWARE\\JetBrains\\*\' 2>$null | Select-Object -Property * | Out-String"', { encoding: 'utf8' });
  if (out.trim()) console.log(out); else console.log('(nada no registro)');
} catch (e) { console.log('registro erro: ' + e.message.split('\n')[0]); }

console.log('\n=== 5. Diretorios de config da Google ===');
const cfgDirs = [
  process.env.APPDATA + '\\Google',
  process.env.LOCALAPPDATA + '\\Google',
  process.env.USERPROFILE + '\\.config\\Google',
  process.env.USERPROFILE + '\\.gradle',
  process.env.USERPROFILE + '\\.android',
];
for (const d of cfgDirs) {
  if (!d) continue;
  console.log('\n--- ' + d + ' ---');
  if (!existsSync(d)) { console.log('  NAO EXISTE'); continue; }
  try {
    const items = readdirSync(d);
    for (const it of items) {
      const p = path.join(d, it);
      try {
        const s = statSync(p);
        console.log('  ' + (s.isDirectory() ? '📁' : '📄') + ' ' + it + (s.isDirectory() ? '/' : ' (' + s.size + ' B)'));
      } catch (e) {}
    }
  } catch (e) { console.log('  erro: ' + e.message); }
}
