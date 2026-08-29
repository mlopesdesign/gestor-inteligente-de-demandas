// Diagnostico COMPLETO de onde vem o Java 25
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

console.log('=== 1. .idea/gradle.xml ===');
const gradleXml = 'E:/Projetos/LOPES FOCUS/android-app/.idea/gradle.xml';
if (existsSync(gradleXml)) {
  console.log(readFileSync(gradleXml, 'utf8'));
} else { console.log('NAO EXISTE'); }

console.log('\n=== 2. gradle.properties do projeto ===');
const gpProj = 'E:/Projetos\LOPES FOCUS/android-app/gradle.properties';
if (existsSync(gpProj)) {
  console.log(readFileSync(gpProj, 'utf8'));
} else { console.log('NAO EXISTE'); }

console.log('\n=== 3. ~/.gradle/gradle.properties (GLOBAL) ===');
const home = process.env.USERPROFILE;
const gpGlobal = path.join(home, '.gradle', 'gradle.properties');
console.log('Path: ' + gpGlobal);
console.log('Existe: ' + existsSync(gpGlobal));
if (existsSync(gpGlobal)) {
  console.log(readFileSync(gpGlobal, 'utf8'));
}

console.log('\n=== 4. JAVA_HOME do processo atual ===');
console.log('JAVA_HOME: ' + (process.env.JAVA_HOME || '(vazio)'));
console.log('GRADLE_JAVA_HOME: ' + (process.env.GRADLE_JAVA_HOME || '(vazio)'));
console.log('GRADLE_OPTS: ' + (process.env.GRADLE_OPTS || '(vazio)'));
console.log('JAVA_OPTS: ' + (process.env.JAVA_OPTS || '(vazio)'));
console.log('PATH[0..200]: ' + (process.env.PATH || '').substring(0, 200));

console.log('\n=== 5. JAVA_HOME do sistema (cmd /c echo) ===');
try {
  const out = execSync('cmd /c "echo %JAVA_HOME% & echo %GRADLE_JAVA_HOME%"', { encoding: 'utf8' });
  console.log(out);
} catch (e) { console.log('erro: ' + e.message); }

console.log('\n=== 6. jdk.table.xml do Studio 2026.1.3 ===');
const jdkTable = 'C:/Users/mlope/AppData/Roaming/Google/AndroidStudio2026.1.3/options/jdk.table.xml';
if (existsSync(jdkTable)) {
  const txt = readFileSync(jdkTable, 'utf8');
  const blocks = txt.match(/<jdk[^>]*>[\s\S]*?<\/jdk>/g) || [];
  console.log('Total JDKs: ' + blocks.length);
  blocks.forEach((b, i) => {
    const name = (b.match(/<name value="([^"]+)"/) || [])[1] || '?';
    const ver = (b.match(/<version value="([^"]+)"/) || [])[1] || '?';
    const home = (b.match(/<homePath value="([^"]+)"/) || [])[1] || '?';
    console.log('  JDK #' + (i+1) + ': ' + name + ' | ' + ver + ' | ' + home);
  });
}

console.log('\n=== 7. JBR embutido no Studio ===');
const jbrPaths = [
  'C:/Program Files/Android Studio/jbr',
  'C:/Program Files/Android Studio/Android Studio/jbr',
  'C:/Program Files/Google/Android Studio/jbr',
];
for (const p of jbrPaths) {
  if (existsSync(p)) {
    console.log('EXISTE: ' + p);
    const rel = path.join(p, 'release');
    if (existsSync(rel)) {
      console.log('  ' + readFileSync(rel, 'utf8').split('\n').slice(0,5).join('\n  '));
    }
  }
}

console.log('\n=== 8. Aplications instaladas do Studio ===');
try {
  const out = execSync('cmd /c "dir /B \"C:\\Program Files\" | findstr /I \"android\\|studio\\|jetbrains\""', { encoding: 'utf8' });
  console.log(out);
} catch (e) { console.log('erro: ' + e.message); }

console.log('\n=== 9. gradlew.bat (verificar se patch está intacto) ===');
const gw = 'E:/Projetos\LOPES FOCUS/android-app/gradlew.bat';
if (existsSync(gw)) {
  const txt = readFileSync(gw, 'utf8');
  const linhas = txt.split(/\r?\n/);
  console.log('Linhas 38-46:');
  linhas.slice(38, 47).forEach((l, i) => console.log('  ' + (39+i) + ': ' + l));
}
