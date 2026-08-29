// Diagnostico do erro "Incompatible Gradle JVM version"
// Lê só. Não modifica nada.
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const PROJECT = 'E:/Projetos/LOPES FOCUS/android-app';
const jdkPath = 'A:/AI/sdk/jdk-17/jdk-17.0.20.1+1';
const javaExe = path.join(jdkPath, 'bin', 'java.exe');

console.log('=== 1. JDK 17 ===');
console.log('Path:    ' + jdkPath);
console.log('Existe:  ' + existsSync(jdkPath));
console.log('java.exe: ' + existsSync(javaExe));
if (existsSync(javaExe)) {
  try {
    const v = execSync('"' + javaExe + '" -version', { encoding: 'utf8' });
    console.log('Versao:');
    console.log(v);
  } catch (e) {
    console.log('ERRO java -version: ' + e.message);
  }
}

console.log('\n=== 2. Gradle Wrapper ===');
const gw = path.join(PROJECT, 'gradle', 'wrapper', 'gradle-wrapper.properties');
if (existsSync(gw)) {
  console.log(readFileSync(gw, 'utf8'));
} else {
  console.log('NAO encontrado: ' + gw);
}

console.log('\n=== 3. ~/.gradle/gradle.properties (GLOBAL) ===');
const home = process.env.USERPROFILE || process.env.HOME;
const ggp = path.join(home, '.gradle', 'gradle.properties');
console.log('Path: ' + ggp);
console.log('Existe: ' + existsSync(ggp));
if (existsSync(ggp)) {
  console.log('--- conteudo ---');
  console.log(readFileSync(ggp, 'utf8'));
  console.log('--- fim ---');
}

console.log('\n=== 4. .idea/gradle.xml (config Studio) ===');
const gradleXml = path.join(PROJECT, '.idea', 'gradle.xml');
console.log('Existe: ' + existsSync(gradleXml));
if (existsSync(gradleXml)) {
  console.log(readFileSync(gradleXml, 'utf8').substring(0, 3000));
}

console.log('\n=== 5. app/build.gradle.kts (compileOptions + AGP) ===');
const bg = path.join(PROJECT, 'app', 'build.gradle.kts');
if (existsSync(bg)) {
  const txt = readFileSync(bg, 'utf8');
  // Pega só as partes relevantes
  const linhas = txt.split('\n');
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i].toLowerCase();
    if (l.includes('compileoptions') || l.includes('jvmtarget') || l.includes('kotlindsl') ||
        l.includes('com.android.application') || l.includes('kotlinoptions') || l.includes('sourcecompatibility') ||
        l.includes('targetcompatibility') || l.includes('version')) {
      console.log('  L' + (i+1) + ': ' + linhas[i]);
    }
  }
}

console.log('\n=== 6. build.gradle.kts raiz ===');
const bgroot = path.join(PROJECT, 'build.gradle.kts');
if (existsSync(bgroot)) {
  console.log(readFileSync(bgroot, 'utf8').substring(0, 2000));
}

console.log('\n=== 7. libs.versions.toml ===');
const lv = path.join(PROJECT, 'gradle', 'libs.versions.toml');
if (existsSync(lv)) {
  console.log(readFileSync(lv, 'utf8'));
}
