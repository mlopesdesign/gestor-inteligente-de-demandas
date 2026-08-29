import { readFileSync, statSync } from 'node:fs';

const p = 'C:/Users/mlope/AppData/Local/Google/AndroidStudio2026.1.3/log/idea.log';
const txt = readFileSync(p, 'utf8');
const lines = txt.split(/\r?\n/);
console.log('Total linhas: ' + lines.length);

// Procura erros relacionados a teclado
const patterns = ['keyboard', 'Keyboard', 'KEYBOARD', 'input method', 'InputMethod', 'IME', 'keymap', 'Keymap', 'KeyMap', 'action', 'shortcut', 'Shortcut', 'composit', 'dead', 'compose'];
console.log('\n=== Linhas com termos de teclado/input ===');
const matches = [];
for (let i = lines.length - 1; i >= 0; i--) {
  const l = lines[i];
  for (const p of patterns) {
    if (l.includes(p)) {
      matches.push({ i, line: l });
      break;
    }
  }
}
console.log('Total matches: ' + matches.length);
// Ultimas 30
matches.slice(0, 30).forEach(m => console.log('L' + (m.i + 1) + ': ' + m.line.substring(0, 200)));

// Procura erros
console.log('\n=== ERROS recentes ===');
const errs = [];
for (let i = lines.length - 1; i >= 0; i--) {
  const l = lines[i];
  if (/\b(ERROR|FATAL|Exception)\b/.test(l) && !l.includes('WARNING') && !l.includes('Caused by')) {
    errs.push({ i, line: l });
    if (errs.length > 30) break;
  }
}
errs.slice(0, 20).forEach(m => console.log('L' + (m.i + 1) + ': ' + m.line.substring(0, 200)));
