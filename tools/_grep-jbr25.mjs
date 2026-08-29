// Procura QUALQUER referencia a JBR 25 / Java 25 em arquivos do projeto
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = 'E:/Projetos/LOPES FOCUS/android-app';
const targets = ['A:/AI/tools/AndroidStudio/jbr', 'Java 25', 'Java 21', 'jbr-25', '25.0.1', '25.0.2', 'GRADLE_LOCAL_JAVA_HOME'];

function walk(d, depth=0, results=[]) {
  if (depth > 4) return results;
  try {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === 'build' || e.name.startsWith('.git') || e.name === 'node_modules') continue;
        walk(p, depth + 1, results);
      } else if (e.isFile()) {
        const ext = path.extname(p).toLowerCase();
        if (['.xml', '.properties', '.kt', '.kts', '.gradle', '.json', '.txt', '.md', '.cmd', '.bat'].includes(ext)) {
          try {
            const t = readFileSync(p, 'utf8');
            for (const tg of targets) {
              if (t.includes(tg)) {
                results.push({ path: p, target: tg });
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

console.log('=== Procurando referencias a JBR 25 / Java 25 / GRADLE_LOCAL_JAVA_HOME ===');
const found = walk(root);
if (found.length === 0) {
  console.log('Nenhuma referencia encontrada no projeto.');
} else {
  console.log('Encontrado em ' + found.length + ' lugares:');
  for (const f of found) {
    console.log('  [' + f.target + '] ' + f.path);
  }
}

console.log('');
console.log('=== Conteudo atual do .gradle/config.properties ===');
const cfg = path.join(root, '.gradle', 'config.properties');
if (existsSync(cfg)) {
  console.log(readFileSync(cfg, 'utf8'));
}

console.log('');
console.log('=== Conteudo atual do .idea/gradle.xml ===');
const gx = path.join(root, '.idea', 'gradle.xml');
if (existsSync(gx)) {
  console.log(readFileSync(gx, 'utf8'));
}
