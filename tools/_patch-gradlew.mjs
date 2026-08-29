// Patch do gradlew.bat pra forcar JAVA_HOME=JDK17
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const p = 'E:/Projetos/LOPES FOCUS/android-app/gradlew.bat';

// 1. Backup
copyFileSync(p, p + '.original');
console.log('Backup criado: gradlew.bat.original');

// 2. Patch
let txt = readFileSync(p, 'utf8');
const old = '@rem Find java.exe\nif defined JAVA_HOME goto findJavaFromJavaHome';
const neu = [
  '@rem FORCA JDK 17 (workaround JBR 25 do Android Studio em AGP 8.7.3 + Gradle 8.10.2)',
  'set "JAVA_HOME=A:\\AI\\sdk\\jdk-17\\jdk-17.0.20.1+1"',
  '@rem Find java.exe',
  'if defined JAVA_HOME goto findJavaFromJavaHome'
].join('\r\n');

if (!txt.includes(old)) { console.error('LINHA NAO ENCONTRADA — abortando'); process.exit(1); }
txt = txt.replace(old, neu);
writeFileSync(p, txt, 'utf8');
console.log('Patch aplicado');

// 3. Verifica
const novo = readFileSync(p, 'utf8');
const linhas = novo.split(/\r?\n|\r/);
console.log('Linhas 38-46:');
linhas.slice(38, 47).forEach((l, i) => console.log('  ' + (39 + i) + ': ' + l));
