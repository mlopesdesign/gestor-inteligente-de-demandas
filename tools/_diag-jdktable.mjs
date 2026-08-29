// Inspecao do jdk.table.xml
import { readFileSync, existsSync } from 'node:fs';
const p = 'C:/Users/mlope/AppData/Roaming/Google/AndroidStudio2026.1.3/options/jdk.table.xml';
if (!existsSync(p)) { console.log('NAO EXISTE: ' + p); process.exit(0); }
const txt = readFileSync(p, 'utf8');
// Extrai só as tags <jdk ...>...</jdk>
const blocks = txt.match(/<jdk[^>]*>[\s\S]*?<\/jdk>/g) || [];
console.log('Total de <jdk> blocks: ' + blocks.length);
blocks.forEach((b, i) => {
  const name = (b.match(/<name value="([^"]+)"/) || [])[1] || '?';
  const type = (b.match(/<type value="([^"]+)"/) || [])[1] || '?';
  const ver = (b.match(/<version value="([^"]+)"/) || [])[1] || '?';
  const home = (b.match(/<homePath value="([^"]+)"/) || [])[1] || '?';
  console.log('JDK #' + (i + 1) + ':');
  console.log('  name:    ' + name);
  console.log('  type:    ' + type);
  console.log('  version: ' + ver);
  console.log('  home:    ' + home);
});
