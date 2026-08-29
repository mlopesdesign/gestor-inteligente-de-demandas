// Adiciona Temurin 17.0.20.1 ao jdk.table.xml do Studio
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const jdkTablePath = 'C:/Users/mlope/AppData/Roaming/Google/AndroidStudio2026.1.3/options/jdk.table.xml';
const jdkPath = 'a:/AI/sdk/jdk-17/jdk-17.0.20.1+1';
const jdkName = 'temurin-17.0.20.1';

// Modulos do JDK 17 (do release file)
const releasePath = 'A:/AI/sdk/jdk-17/jdk-17.0.20.1+1/release';
if (!existsSync(releasePath)) { console.error('release file nao existe: ' + releasePath); process.exit(1); }
const release = readFileSync(releasePath, 'utf8');
const modsMatch = release.match(/MODULES="([^"]+)"/);
if (!modsMatch) { console.error('MODULES nao encontrado no release'); process.exit(1); }
const modules = modsMatch[1].split(/\s+/);
console.log('Modulos encontrados: ' + modules.length);

// Gera a entrada XML
const jdkUrl = jdkPath.replace(/^\w:/, (m) => m.toLowerCase());
let xml = '\n    <jdk version="2">\n';
xml += '      <name value="' + jdkName + '" />\n';
xml += '      <type value="JavaSDK" />\n';
xml += '      <version value="java version &quot;17.0.20.1&quot;" />\n';
xml += '      <homePath value="' + jdkPath + '" />\n';
xml += '      <roots>\n';
xml += '        <annotationsPath>\n';
xml += '          <root type="composite">\n';
xml += '            <root url="jar://' + jdkUrl + '/lib/src.zip!/" type="simple" />\n';
xml += '          </root>\n';
xml += '        </annotationsPath>\n';
xml += '        <classPath>\n';
xml += '          <root type="composite">\n';
for (const m of modules) {
  xml += '            <root type="simple" url="jrt://' + jdkUrl + '!/' + m + '" />\n';
}
xml += '          </root>\n';
xml += '        </classPath>\n';
xml += '        <javadocPath>\n';
xml += '          <root type="composite" />\n';
xml += '        </javadocPath>\n';
xml += '        <sourcePath>\n';
xml += '          <root type="composite">\n';
xml += '            <root url="jar://' + jdkUrl + '/lib/src.zip!/" type="simple" />\n';
xml += '          </root>\n';
xml += '        </sourcePath>\n';
xml += '      </roots>\n';
xml += '    </jdk>\n';

// Insere antes do </application>
let txt = readFileSync(jdkTablePath, 'utf8');
if (txt.includes('name value="' + jdkName + '"')) {
  console.log('JDK "' + jdkName + '" ja existe no jdk.table.xml. Nada a fazer.');
  process.exit(0);
}
txt = txt.replace('</application>', xml + '  </application>');
writeFileSync(jdkTablePath, txt, 'utf8');
console.log('Adicionado: ' + jdkName);
console.log('Tamanho: ' + (txt.length / 1024).toFixed(1) + ' KB');
