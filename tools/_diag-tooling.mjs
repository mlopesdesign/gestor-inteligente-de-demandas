// Investigacao da config do Gradle Tooling API
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = 'E:/Projetos/LOPES FOCUS/android-app';

console.log('=== 1. .gradle/config.properties (prioridade maxima) ===');
const cfg1 = path.join(root, '.gradle', 'config.properties');
console.log('Path: ' + cfg1);
console.log('Existe: ' + existsSync(cfg1));
if (existsSync(cfg1)) {
  console.log('--- conteudo ---');
  console.log(readFileSync(cfg1, 'utf8'));
  console.log('--- fim ---');
}

console.log('\n=== 2. ~/.gradle/config.properties (GLOBAL) ===');
const home = process.env.USERPROFILE;
const cfg2 = path.join(home, '.gradle', 'config.properties');
console.log('Path: ' + cfg2);
console.log('Existe: ' + existsSync(cfg2));
if (existsSync(cfg2)) {
  console.log('--- conteudo ---');
  console.log(readFileSync(cfg2, 'utf8'));
  console.log('--- fim ---');
}

console.log('\n=== 3. .gradle/ (tudo) ===');
const gradleDir = path.join(root, '.gradle');
if (existsSync(gradleDir)) {
  console.log('Listando: ' + gradleDir);
  function walk(d, depth=0) {
    if (depth > 3) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      console.log('  '.repeat(depth) + (e.isDirectory() ? '📁' : '📄') + ' ' + e.name);
      if (e.isDirectory() && depth < 2) walk(p, depth + 1);
    }
  }
  walk(gradleDir);
}

console.log('\n=== 4. .idea/ (tudo) ===');
const ideaDir = path.join(root, '.idea');
if (existsSync(ideaDir)) {
  console.log('Listando: ' + ideaDir);
  for (const e of readdirSync(ideaDir)) {
    const p = path.join(ideaDir, e);
    const s = statSync(p);
    console.log('  ' + (s.isDirectory() ? '📁' : '📄') + ' ' + e + ' (' + s.size + ' B)');
  }
}

console.log('\n=== 5. .idea/misc.xml ===');
const misc = path.join(ideaDir, 'misc.xml');
if (existsSync(misc)) {
  console.log(readFileSync(misc, 'utf8').substring(0, 3000));
}

console.log('\n=== 6. .idea/workspace.xml ===');
const ws = path.join(ideaDir, 'workspace.xml');
if (existsSync(ws)) {
  const t = readFileSync(ws, 'utf8');
  // Procura java/jdk/gradle
  const lines = t.split(/\r?\n/);
  lines.forEach((l, i) => {
    if (/java|jdk|gradle|jbr|jvm/i.test(l)) {
      console.log('  L' + (i+1) + ': ' + l.trim().substring(0, 200));
    }
  });
}

console.log('\n=== 7. .idea/gradle.xml (estado atual) ===');
const gx = path.join(ideaDir, 'gradle.xml');
if (existsSync(gx)) {
  console.log(readFileSync(gx, 'utf8'));
}

console.log('\n=== 8. GRADLE_USER_HOME / GRADLE_LOCAL_JAVA_HOME ===');
console.log('GRADLE_USER_HOME: ' + (process.env.GRADLE_USER_HOME || '(vazio)'));
console.log('GRADLE_LOCAL_JAVA_HOME: ' + (process.env.GRADLE_LOCAL_JAVA_HOME || '(vazio)'));
console.log('GRADLE_OPTS: ' + (process.env.GRADLE_OPTS || '(vazio)'));

console.log('\n=== 9. PROCURA gradle.properties em TODOS os lugares ===');
function findGp(d, depth=0, results=[]) {
  if (depth > 4) return results;
  try {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory() && !e.name.startsWith('.git') && e.name !== 'node_modules' && e.name !== 'build') {
        findGp(p, depth + 1, results);
      } else if (e.isFile() && e.name === 'gradle.properties') {
        results.push(p);
      }
    }
  } catch (e) {}
  return results;
}
const gps = findGp(root);
console.log('gradle.properties encontrados: ' + gps.length);
gps.forEach(p => {
  console.log('\n--- ' + p + ' ---');
  const t = readFileSync(p, 'utf8');
  console.log(t);
});
