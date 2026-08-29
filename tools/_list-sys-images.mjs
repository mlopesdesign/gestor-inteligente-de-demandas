import { execSync } from 'node:child_process';
try {
  const out = execSync('cmd /c "A:\\AI\\sdk\\android\\cmdline-tools\\latest\\bin\\sdkmanager.bat --list"', { encoding: 'utf8', timeout: 60000 });
  const lines = out.split(/\r?\n/).filter(l => l.includes('system-images;android-'));
  console.log('Total: ' + lines.length);
  console.log('--- x86_64 ---');
  lines.filter(l => l.includes('x86_64') && l.includes('default') && !l.includes('google_apis_playstore')).slice(0, 20).forEach(l => console.log('  ' + l.trim()));
} catch (e) { console.log('erro: ' + e.message); }
