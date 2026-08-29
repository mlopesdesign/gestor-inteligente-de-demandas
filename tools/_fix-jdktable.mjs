// Remove entrada temurin-17.0.20.1 bugada do jdk.table.xml
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const p = 'C:/Users/mlope/AppData/Roaming/Google/AndroidStudio2026.1.3/options/jdk.table.xml';
if (!existsSync(p)) { console.log('NAO EXISTE: ' + p); process.exit(1); }

let txt = readFileSync(p, 'utf8');
const sizeBefore = txt.length;

// Remove a entrada temurin-17.0.20.1
const regex = /\s*<jdk version="2">\s*<name value="temurin-17\.0\.20\.1"[\s\S]*?<\/jdk>/;
if (!regex.test(txt)) {
  console.log('Entrada temurin-17.0.20.1 NAO encontrada no jdk.table.xml');
} else {
  txt = txt.replace(regex, '');
  writeFileSync(p, txt, 'utf8');
  console.log('Removida entrada temurin-17.0.20.1 do jdk.table.xml');
  console.log('Tamanho: ' + sizeBefore + ' -> ' + txt.length + ' B');
}

// Lista JDKs restantes
const blocks = txt.match(/<jdk[^>]*>[\s\S]*?<\/jdk>/g) || [];
console.log('JDKs restantes: ' + blocks.length);
blocks.forEach((b, i) => {
  const name = (b.match(/<name value="([^"]+)"/) || [])[1] || '?';
  const home = (b.match(/<homePath value="([^"]+)"/) || [])[1] || '?';
  console.log('  ' + (i+1) + '. ' + name + ' | ' + home);
});
