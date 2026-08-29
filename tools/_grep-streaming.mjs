import { readFileSync } from 'node:fs';

const p = 'C:/Users/mlope/AppData/Local/Google/AndroidStudio2026.1.3/log/idea.log';
const txt = readFileSync(p, 'utf8');
const lines = txt.split(/\r?\n/);

// Procura problemas com streaming device e input
const patterns = ['streaming', 'Streaming', 'RunningDevice', 'running device', 'sendKey', 'sendkey', 'key event', 'input keyevent', 'focus', 'emulator', 'Emulator', 'adb shell input', 'ADB_INPUT', 'not responding', 'hang', 'frozen', 'deadlock', 'TIMEOUT'];
const matches = [];
for (let i = lines.length - 1; i >= 0; i--) {
  const l = lines[i];
  for (const p of patterns) {
    if (l.includes(p)) {
      matches.push({ i, line: l, pattern: p });
      break;
    }
  }
}

console.log('=== Top 30 matches recentes (streaming/input/focus) ===');
matches.slice(0, 30).forEach(m => {
  console.log('L' + (m.i + 1) + ' [' + m.pattern + ']: ' + m.line.substring(0, 250));
});

// Procura erros
console.log('\n=== ERROR linhas recentes ===');
const errs = [];
for (let i = lines.length - 1; i >= 0; i--) {
  const l = lines[i];
  if (/\bERROR\b/.test(l) || /\bFATAL\b/.test(l) || /\bException in\b/.test(l)) {
    errs.push({ i, line: l });
    if (errs.length > 50) break;
  }
}
errs.slice(0, 15).forEach(m => console.log('L' + (m.i + 1) + ': ' + m.line.substring(0, 250)));
