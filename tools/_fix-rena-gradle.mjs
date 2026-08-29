import { readFileSync, writeFileSync } from 'node:fs';
const p = 'E:/APP/app-rena/android/gradle.properties';
let txt = readFileSync(p, 'utf8');
console.log('=== ANTES ===');
console.log(txt.split(/\r?\n/).filter(l => l.includes('java.home')).join('\n'));

// Corrigir path
const oldLine = 'org.gradle.java.home=C:\\\\Program Files\\\\Android\\\\Android Studio\\\\jbr';
const newLine = 'org.gradle.java.home=A:/AI/tools/AndroidStudio/jbr';
if (txt.includes(oldLine)) {
  txt = txt.replace(oldLine, newLine);
  writeFileSync(p, txt, 'utf8');
  console.log('\n=== Corrigido ===');
  console.log('java.home -> ' + newLine);
} else {
  console.log('Linha nao encontrada, vou tentar variações...');
  const variations = [
    'org.gradle.java.home=C:\\Program Files\\Android\\Android Studio\\jbr',
    'org.gradle.java.home=C:/Program Files/Android/Android Studio/jbr',
  ];
  for (const v of variations) {
    if (txt.includes(v)) {
      txt = txt.replace(v, newLine);
      writeFileSync(p, txt, 'utf8');
      console.log('Corrigido usando: ' + v);
      break;
    }
  }
}
console.log('\n=== DEPOIS ===');
console.log(readFileSync(p, 'utf8').split(/\r?\n/).filter(l => l.includes('java.home')).join('\n'));
