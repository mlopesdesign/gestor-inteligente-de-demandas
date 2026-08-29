// Procura crash logs
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// 1. Crashpad dumps
console.log('=== Crashpad dumps (USERPROFILE) ===');
const home = process.env.USERPROFILE;
const crashpadDirs = [
  path.join(home, 'AppData', 'Local', 'Crashpad', 'reports'),
  path.join(home, 'AppData', 'Local', 'Google', 'AndroidStudio2026.1.3', 'caches'),
  path.join(home, 'AppData', 'Local', 'Google', 'AndroidStudio2026.1.3', 'log'),
  'C:/Users/mlope/AppData/Roaming/AndroidStudio2026.1.3/crashes',
];
for (const d of crashpadDirs) {
  if (!existsSync(d)) { console.log('nao existe: ' + d); continue; }
  console.log('=== ' + d + ' ===');
  try {
    const items = readdirSync(d);
    for (const it of items.slice(0, 20)) {
      const p = path.join(d, it);
      try {
        const s = statSync(p);
        console.log('  ' + (s.isDirectory() ? '📁' : '📄') + ' ' + it + (s.isFile() ? ' (' + s.size + ' B)' : ''));
      } catch (e) {}
    }
  } catch (e) { console.log('  erro: ' + e.message); }
}

// 2. Eventos recentes do Windows
console.log('\n=== Eventos do Windows (Application, ultimos 5 min) ===');
try {
  const o = execSync('powershell -Command "Get-EventLog -LogName Application -Newest 20 -EntryType Error -After (Get-Date).AddMinutes(-15) 2>$null | Select-Object -First 5 | Format-List TimeGenerated,Source,Message" 2>&1', { encoding: 'utf8' });
  console.log(o);
} catch (e) { console.log('eventlog erro: ' + e.message); }
