// Investigacao profunda do JDK 17
import { existsSync, readFileSync, statSync, readlinkSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const jdkPath = 'A:/AI/sdk/jdk-17/jdk-17.0.20.1+1';

console.log('=== 1. release file (fonte da verdade da versao) ===');
const release = path.join(jdkPath, 'release');
if (existsSync(release)) {
  console.log(readFileSync(release, 'utf8'));
}

console.log('\n=== 2. Estrutura do JDK 17 (top-level + bin) ===');
try {
  const top = readdirSync(jdkPath);
  console.log('Top-level: ' + top.join(', '));
  const bin = path.join(jdkPath, 'bin');
  if (existsSync(bin)) {
    const binFiles = readdirSync(bin).filter(x => x.endsWith('.exe') || x === 'java');
    console.log('bin/: ' + binFiles.join(', '));
  }
} catch (e) { console.log('ERRO: ' + e.message); }

console.log('\n=== 3. Verifica se e symlink ===');
const s = statSync(jdkPath);
console.log('isSymbolicLink: ' + s.isSymbolicLink());
if (s.isSymbolicLink()) {
  try { console.log('Link target: ' + readlinkSync(jdkPath)); } catch(e) {}
}

console.log('\n=== 4. Procura JBR 21 e JBR 25 ===');
const candidates = [
  'A:/AI/jbr', 'A:/AI/jbr21', 'A:/AI/jbr25', 'A:/AI/sdk/jbr',
  'C:/Program Files/Android Studio/jbr',
  'C:/Program Files/Android Studio/Android Studio/jbr',
  'A:/AI/IntelliJ', 'A:/AI/idea',
];
for (const c of candidates) {
  console.log((existsSync(c) ? 'SIM' : 'NAO') + ' - ' + c);
}

console.log('\n=== 5. ~/.gradle/jdks/ (cache de JDKs do Gradle) ===');
const home = process.env.USERPROFILE || process.env.HOME;
const gjdks = path.join(home, '.gradle', 'jdks');
if (existsSync(gjdks)) {
  const vers = readdirSync(gjdks);
  for (const v of vers) {
    const p = path.join(gjdks, v);
    const ps = statSync(p);
    console.log('  ' + v + ' (' + ps.size + ' B)');
    const rel = path.join(p, 'release');
    if (existsSync(rel)) {
      const r = readFileSync(rel, 'utf8');
      console.log(r.split('\n').slice(0, 5).join('\n    '));
    }
  }
} else { console.log('NAO existe'); }

console.log('\n=== 6. Conteudo de A:/AI (1 nivel) ===');
try {
  const ai = readdirSync('A:/AI');
  console.log(ai.join(', '));
} catch(e) { console.log('ERRO: ' + e.message); }
