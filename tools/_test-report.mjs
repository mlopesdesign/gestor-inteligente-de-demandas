// Coleta relatorio de testes + lint + APK
import { existsSync, readdirSync, readFileSync, statSync, readFileSync as rfs } from 'node:fs';
import path from 'node:path';

const root = 'E:/Projetos/LOPES FOCUS/android-app';

// 1. Test results
console.log('=== UNIT TESTS ===');
const testResults = path.join(root, 'app/build/test-results/testDebugUnitTest');
if (existsSync(testResults)) {
  const xmls = readdirSync(testResults).filter(f => f.endsWith('.xml'));
  console.log('XMLs de teste: ' + xmls.length);
  let total = 0, fails = 0, errors = 0, skipped = 0;
  for (const x of xmls) {
    const t = readFileSync(path.join(testResults, x), 'utf8');
    const m = t.match(/testsuite[^>]*tests="(\d+)"[^>]*failures="(\d+)"[^>]*errors="(\d+)"[^>]*skipped="(\d+)"/);
    if (m) {
      total += +m[1]; fails += +m[2]; errors += +m[3]; skipped += +m[4];
    }
  }
  console.log('Total: ' + total + ' testes, ' + fails + ' falhas, ' + errors + ' erros, ' + skipped + ' skipped');
}

// 2. Lint report
console.log('');
console.log('=== LINT ===');
const lintHtml = path.join(root, 'app/build/reports/lint-results-debug.html');
if (existsSync(lintHtml)) {
  const s = statSync(lintHtml);
  const t = readFileSync(lintHtml, 'utf8');
  // Procura contadores
  const errors = (t.match(/(\d+)\s*errors?/gi) || []);
  const warnings = (t.match(/(\d+)\s*warnings?/gi) || []);
  console.log('Lint report: ' + (s.size/1024).toFixed(1) + ' KB');
  console.log('  mentions: ' + errors.slice(0,3).join(', ') + ' | ' + warnings.slice(0,3).join(', '));
}

// 3. APK
console.log('');
console.log('=== APK ===');
const apk = path.join(root, 'app/build/outputs/apk/debug/app-debug.apk');
if (existsSync(apk)) {
  const s = statSync(apk);
  console.log('  tamanho: ' + (s.size/1024/1024).toFixed(2) + ' MB');
  console.log('  mtime: ' + s.mtime.toISOString().substring(0,19));
}
