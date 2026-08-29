// AUDITORIA COMPLETA: lista arquivos modificados + verifica encoding
import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

console.log('=== 1. Arquivos do projeto (workspace) que eu mexi ===');
const projectFiles = [
  // Diretorio do projeto
  'E:/Projetos/LOPES FOCUS/AGENTS.md',
  'E:/Projetos/LOPES FOCUS/GRAPHIFY.md',
  'E:/Projetos/LOPES FOCUS/android-app/.gradle/config.properties',
  'E:/Projetos/LOPES FOCUS/android-app/.idea/gradle.xml',
  'E:/Projetos/LOPES FOCUS/android-app/gradle.properties',
  'E:/Projetos/LOPES FOCUS/android-app/gradlew.bat',
  'E:/Projetos/LOPES FOCUS/android-app/docs/F4-ANDROID-VALIDATION.md',
  'E:/Projetos/LOPES FOCUS/android-app/app/build.gradle.kts',
  // Renascenca Clube
  'E:/APP/app-rena/android/gradle.properties',
];

for (const p of projectFiles) {
  if (!existsSync(p)) { console.log('NAO EXISTE: ' + p); continue; }
  const s = statSync(p);
  const txt = readFileSync(p, 'utf8');
  // Verifica BOM
  const buf = readFileSync(p); // Buffer raw
  const hasBOM = buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
  // Procura double encoding (bytes C3 83 C2 XX)
  let doubleEnc = '';
  for (let i = 0; i < buf.length - 3; i++) {
    if (buf[i] === 0xC3 && buf[i+1] === 0x83 && buf[i+2] === 0xC2) {
      doubleEnc = 'SIM (encontrei ' + buf.slice(i, i+6).toString('hex') + ')';
      break;
    }
  }
  console.log(`${p}:`);
  console.log(`  size: ${s.size} B, mtime: ${s.mtime.toISOString().substring(0,19)}`);
  console.log(`  BOM: ${hasBOM ? 'SIM' : 'NAO'}`);
  console.log(`  double-encoding: ${doubleEnc || 'NAO'}`);
}

console.log('\n=== 2. Arquivos FORA do workspace que eu mexi ===');
const outsideFiles = [
  'C:/Users/mlope/.gradle/gradle.properties',
  'C:/Users/mlope/AppData/Roaming/Google/AndroidStudio2026.1.3/options/jdk.table.xml',
  'A:/AI/tools/AndroidStudio/bin/studio64.exe.vmoptions',
];
for (const p of outsideFiles) {
  if (!existsSync(p)) { console.log('NAO EXISTE: ' + p); continue; }
  const s = statSync(p);
  console.log(`EXISTE: ${p} (${s.size} B, mtime: ${s.mtime.toISOString().substring(0,19)})`);
}

console.log('\n=== 3. Backup files criados (caso precise reverter) ===');
const backups = [
  'A:/AI/tools/AndroidStudio/bin/studio64.exe.vmoptions.original.27-08-2026',
  'E:/Projetos/LOPES FOCUS/android-app/gradlew.bat.original',
  'E:/Projetos/LOPES FOCUS/android-app/app/build.old',
];
for (const p of backups) {
  if (existsSync(p)) console.log('EXISTE: ' + p);
}
