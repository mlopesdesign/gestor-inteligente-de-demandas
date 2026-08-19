"""Publica v0.2.23: correcoes de botoes de excluir + UTF-8 + bump versao"""
import os
import hashlib
import subprocess

ROOT = r'E:\Projetos\LOPES FOCUS'
VERSAO = '0.2.23'

# 1. Calcula SHA do Setup.exe
setup_path = os.path.join(ROOT, 'installer', f'GestorInteligenteDeDemandas-Setup-{VERSAO}.exe')
setup_sha = hashlib.sha256(open(setup_path, 'rb').read()).hexdigest().upper()
setup_size = os.path.getsize(setup_path)
print(f'[publish-v{VERSAO}] Setup SHA: {setup_sha}')
print(f'[publish-v{VERSAO}] Setup size: {setup_size} bytes ({setup_size/1e6:.2f} MB)')

# 2. Update.json (auto-update) — atualiza a URL de resources.neu pra nova versao
update_json_path = os.path.join(ROOT, 'installer', 'update.json')
if os.path.exists(update_json_path):
    with open(update_json_path, 'r', encoding='utf-8') as f:
        uj = f.read()
    # Substitui a URL de resources.neu (case-insensitive)
    import re
    uj_new = re.sub(
        r'(releases/download/)[^/]+(/resources\.neu)',
        rf'\1v{VERSAO}\2',
        uj,
        flags=re.IGNORECASE
    )
    if uj_new != uj:
        with open(update_json_path, 'w', encoding='utf-8') as f:
            f.write(uj_new)
        print(f'[publish-v{VERSAO}] update.json: URL atualizada pra v{VERSAO}')

# 3. Release notes GH (ja existe em installer/RELEASE-NOTES-v0.2.23-GH.md)

# 4. Commit + push
print(f'[publish-v{VERSAO}] 1/3 git commit + push')
res = subprocess.run(
    ['git', '-c', 'user.email=marciobot@local', '-c', 'user.name=Marcio',
     'add', '-A'],
    cwd=ROOT, capture_output=True, text=True
)
res = subprocess.run(
    ['git', '-c', 'user.email=marciobot@local', '-c', 'user.name=Marcio',
     'commit', '-m', f'v{VERSAO}: publica release (GH release + Setup.exe + sha256sums + update.json)'],
    cwd=ROOT, capture_output=True, text=True
)
print('  git commit:', (res.stdout or res.stderr).strip()[:200])

res = subprocess.run(['git', 'push', 'origin', 'main'], cwd=ROOT, capture_output=True, text=True)
print('  git push:', (res.stdout or res.stderr).strip()[:200])

# 5. GH release
print(f'[publish-v{VERSAO}] 2/3 gh release create v{VERSAO}')
res = subprocess.run([
    'gh', 'release', 'create', f'v{VERSAO}',
    '--repo', 'mlopesdesign/gestor-inteligente-de-demandas',
    '--title', f'v{VERSAO} - FIX: botoes de excluir em todas as entidades',
    '--notes-file', os.path.join(ROOT, 'installer', f'RELEASE-NOTES-v{VERSAO}-GH.md'),
    setup_path,
    os.path.join(ROOT, 'dist', 'GestorInteligenteDeDemandas', 'resources.neu'),
    os.path.join(ROOT, 'installer', 'sha256sums.txt'),
], capture_output=True, text=True)
print('  gh release:', (res.stdout or res.stderr).strip()[:500])
if res.returncode != 0:
    raise SystemExit(f'gh release create falhou: exit {res.returncode}')

# 6. Verifica
print(f'[publish-v{VERSAO}] 3/3 verificando')
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
