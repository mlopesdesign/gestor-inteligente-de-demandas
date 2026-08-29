import { readFileSync } from 'node:fs';
console.log('=== ~/.gradle/gradle.properties ===');
console.log(readFileSync('C:/Users/mlope/.gradle/gradle.properties', 'utf8'));
console.log('\n=== studio64.exe.vmoptions (org.gradle.java.home) ===');
const vm = readFileSync('A:/AI/tools/AndroidStudio/bin/studio64.exe.vmoptions', 'utf8');
const flag = vm.split('\n').find(l => l.includes('org.gradle.java.home'));
console.log(flag || '(nao tem)');
