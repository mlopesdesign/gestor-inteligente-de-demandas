// Verifica o daemon REAL que o Studio Sync usou
import { execSync, spawn } from 'node:child_process';
import { existsSync, statSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const daemonDir = 'C:/Users/mlope/.gradle/daemon/8.10.2';
if (existsSync(daemonDir)) {
  const files = readdirSync(daemonDir).filter(f => f.endsWith('.out.log'));
  const withTime = files.map(f => ({ f, t: statSync(path.join(daemonDir, f)).mtimeMs }));
  withTime.sort((a, b) => b.t - a.t);
  console.log('=== 5 DAEMONS MAIS RECENTES ===');
  for (const x of withTime.slice(0, 5)) {
    const txt = readFileSync(path.join(daemonDir, x.f), 'utf8');
    const startLine = txt.split(/\r?\n/).find(l => l.includes('start() called on daemon'));
    const date = new Date(x.t).toISOString();
    console.log('\n' + date + ' | ' + x.f);
    if (startLine) {
      const jhMatch = startLine.match(/javaHome=([^,]+)/);
      const jvMatch = startLine.match(/,javaVersion=([^,]+)/);
      const jvendorMatch = startLine.match(/,javaVendor=([^,]+)/);
      const pidMatch = startLine.match(/pid=(\d+)/);
      console.log('  pid: ' + (pidMatch ? pidMatch[1] : '?'));
      console.log('  javaHome: ' + (jhMatch ? jhMatch[1] : '?'));
      console.log('  javaVersion: ' + (jvMatch ? jvMatch[1] : '?'));
      console.log('  javaVendor: ' + (jvendorMatch ? jvendorMatch[1] : '?'));
    }
  }
}
