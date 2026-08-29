// Busca recursiva por referencias a JBR 25, Java 25, gradleJvm, etc
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const patterns = [
  'A:\\AI\\tools\\AndroidStudio\\jbr',
  'A:/AI/tools/AndroidStudio/jbr',
  '25.0.2',
  '25.0.1',
  'gradleJvm',
  'gradleJavaHome',
  'java.home',
  'GRADLE_LOCAL_JAVA_HOME',
  '#GRADLE_LOCAL_JAVA_HOME',
  'jdkName',
  'gradleHome',
  'JetBrains Runtime 25',
  'jbr-25',
  'jbr-21',
];

const dirs = [
  'C:/Users/mlope/AppData/Roaming/Google/AndroidStudio2026.1.3',
  'C:/Users/mlope/AppData/Local/Google/AndroidStudio2026.1.3',
  'C:/Users/mlope/.gradle',
  'E:/Projetos/LOPES FOCUS/android-app/.idea',
  'E:/Projetos/LOPES FOCUS/android-app/.gradle',
];

function walk(d, depth=0, results=[]) {
  if (depth > 6) return results;
  if (!existsSync(d)) return results;
  try {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        // Pular coisas grandes de cache
        if (e.name === 'caches' || e.name === 'index' || e.name === 'log' || e.name === 'tmp') continue;
        if (e.name.startsWith('.') && depth > 0) continue;
        walk(p, depth + 1, results);
      } else if (e.isFile()) {
        const ext = path.extname(p).toLowerCase();
        if (['.xml', '.properties', '.json', '.txt', '.log', '.kts', '.kt'].includes(ext) || e.name === 'idea.log' || e.name.endsWith('.log')) {
          try {
            const s = statSync(p);
            if (s.size > 5 * 1024 * 1024) continue; // >5MB pula
            const t = readFileSync(p, 'utf8');
            for (const pat of patterns) {
              if (t.includes(pat)) {
                // Conta ocorrências
                const count = (t.match(new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
                results.push({ file: p, pattern: pat, count });
                break;
              }
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  return results;
}

console.log('=== BUSCA RECURSIVA por referencias Java 25 / gradleJvm ===\n');
let allResults = [];
for (const d of dirs) {
  console.log('--- ' + d + ' ---');
  const r = walk(d);
  if (r.length === 0) {
    console.log('  (nada)');
  } else {
    for (const x of r) {
      console.log('  [' + x.pattern + ' x' + x.count + '] ' + x.file);
    }
  }
  allResults = allResults.concat(r);
}

console.log('\n=== TOTAL DE MATCHES: ' + allResults.length + ' ===');

// Salva relatorio
writeFileSync('E:/Projetos/LOPES FOCUS/tools/_forense-report.txt', allResults.map(r => '[' + r.pattern + ' x' + r.count + '] ' + r.file).join('\n'), 'utf8');
console.log('Relatorio salvo em tools/_forense-report.txt');
