// Reverte gradle.properties do Renascenca pro ORIGINAL
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const p = 'E:/APP/app-rena/android/gradle.properties';
let txt = readFileSync(p, 'utf8');
// Reverte o java.home
const oldFix = 'org.gradle.java.home=A:/AI/tools/AndroidStudio/jbr';
const original = 'org.gradle.java.home=C:\\\\Program Files\\\\Android\\\\Android Studio\\\\jbr';
if (txt.includes(oldFix)) {
  txt = txt.replace(oldFix, original);
  writeFileSync(p, txt, 'utf8');
  console.log('REVERTIDO. java.home agora: ' + original);
} else {
  console.log('ja estava OK ou diferente');
}
console.log('---');
console.log(readFileSync(p, 'utf8').split(/\r?\n/).filter(l => l.includes('java.home')).join('\n'));
