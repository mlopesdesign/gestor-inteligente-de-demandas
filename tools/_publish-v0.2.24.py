"""Publica v0.2.24: SYNC Desktop<->WP"""
import os
import hashlib
import subprocess

ROOT = r'E:\Projetos\LOPES FOCUS'
VERSAO = '0.2.24'

# 1. SHA-256
setup_path = os.path.join(ROOT, 'installer', f'GestorInteligenteDeDemandas-Setup-{VERSAO}.exe')
setup_sha = hashlib.sha256(open(setup_path, 'rb').read()).hexdigest().upper()
setup_size = os.path.getsize(setup_path)
print(f'[publish-v{VERSAO}] Setup SHA: {setup_sha}')
print(f'[publish-v{VERSAO}] Setup size: {setup_size} bytes ({setup_size/1e6:.2f} MB)')

# 2. Git commit + push
print(f'[publish-v{VERSAO}] 1/3 git commit + push')
res = subprocess.run(['git', 'add', '-A'], cwd=ROOT, capture_output=True, text=True)
res = subprocess.run(
    ['git', '-c', 'user.email=marciobot@local', '-c', 'user.name=Marcio',
     'commit', '-m', f'v{VERSAO}: SYNC bidirecional Desktop<->WP (F3)'],
    cwd=ROOT, capture_output=True, text=True
)
print('  git commit:', (res.stdout or res.stderr).strip()[:200])
res = subprocess.run(['git', 'push', 'origin', 'main'], cwd=ROOT, capture_output=True, text=True)
print('  git push:', (res.stdout or res.stderr).strip()[:200])

# 3. GH release
print(f'[publish-v{VERSAO}] 2/3 gh release create')
res = subprocess.run([
    'gh', 'release', 'create', f'v{VERSAO}',
    '--repo', 'mlopesdesign/gestor-inteligente-de-demandas',
    '--title', f'v{VERSAO} - SYNC: Desktop bidirecional com WordPress',
    '--notes-file', os.path.join(ROOT, 'installer', f'RELEASE-NOTES-v{VERSAO}-GH.md'),
    setup_path,
    os.path.join(ROOT, 'dist', 'GestorInteligenteDeDemandas', 'resources.neu'),
    os.path.join(ROOT, 'installer', 'sha256sums.txt'),
], capture_output=True, text=True)
print('  gh release:', (res.stdout or res.stderr).strip()[:500])
if res.returncode != 0:
    raise SystemExit(f'gh release create falhou: exit {res.returncode}')

# 4. Verifica
res = subprocess.run(
    ['gh', 'release', 'view', f'v{VERSAO}', '--repo', 'mlopesdesign/gestor-inteligente-de-demandas'],
    capture_output=True, text=True
)
print('  ', (res.stdout or res.stderr).strip()[:1000])

print()
print('=' * 50)
print(f'v{VERSAO} PUBLICADA')
print('=' * 50)
print(f'Setup SHA: {setup_sha}')
print(f'Setup size: {setup_size} bytes ({setup_size/1e6:.2f} MB)')
print(f'Release: https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/tag/v{VERSAO}')
