#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Publica v0.2.22: FIX icone dos atalhos (lampada MLOPES DEV)"""
import os, shutil, subprocess, hashlib

nova_versao = '0.2.22'
novo_sha = hashlib.sha256(open(r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.22.exe', 'rb').read()).hexdigest().upper()
novo_size = os.path.getsize(r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.22.exe')

novas_notas = 'v0.2.22 - FIX icone dos atalhos: o atalho do Gestor Inteligente de Demandas na Area de Trabalho e no Menu Iniciar estava com icone GENERICO do Windows (pagina com imagem) em vez da lampada MLOPES DEV. Causa: o installer/resources/icon.ico nao estava sendo copiado pro app-image, e o IconFilename do .iss apontava pro .exe (que tem icone generico do Neutralino). Agora: build.mjs copia o icon.ico pro dist, e o IconFilename aponta direto pro {app}\\icon.ico.'

novo_json = '''{
  "applicationId": "app.mllopes.gestor",
  "version": "''' + nova_versao + '''",
  "notes": "''' + novas_notas + '''",
  "resourcesURL": "https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/download/v''' + nova_versao + '''/resources.neu",
  "sha256": "''' + novo_sha + '''",
  "size": ''' + str(novo_size) + '''
}
'''

with open(r'E:\Projetos\LOPES FOCUS\update.json', 'w', encoding='utf-8') as f:
    f.write(novo_json)
print('OK: update.json (raiz)')

gh_dir = r'C:\Users\mlope\Documents\GitHub\gestor-inteligente-de-demandas'
if os.path.exists(gh_dir):
    shutil.copy2(r'E:\Projetos\LOPES FOCUS\update.json', os.path.join(gh_dir, 'update.json'))
    os.chdir(gh_dir)
    subprocess.run(['git', 'add', 'update.json'], check=True)
    subprocess.run(['git', '-c', 'user.email=marcio@gestor.local', '-c', 'user.name=Marcio Lopes', 'commit', '-m', 'update.json v0.2.22'], capture_output=True, text=True)
    subprocess.run(['git', 'push', 'origin', 'gh-pages'], capture_output=True, text=True)
    print('gh-pages: OK')

# Release notes
with open(r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.22.md', 'w', encoding='utf-8') as f:
    f.write('''# v0.2.22 - FIX icone dos atalhos

## O bug

O atalho do "Gestor Inteligente de Demandas" na Area de Trabalho e no Menu Iniciar estava com o icone GENERICO do Windows (pagina com imagem) em vez da lampada MLOPES DEV. App tava rodando normal, mas o atalho tava com icone errado.

## Causa

1. O `installer/resources/icon.ico` NAO estava sendo copiado pro `dist/GestorInteligenteDeDemandas/` pelo `build.mjs`.
2. O `IconFilename` no `gestor.iss` apontava pro `.exe` (que tem icone generico do Neutralino), nao pro `.ico` diretamente.

## Correcao

- `tools/build.mjs`: agora copia o `installer/resources/icon.ico` pro dist
- `installer/gestor.iss`: `IconFilename` agora aponta direto pro `{app}\\icon.ico` em vez do exe

## Instalacao

Baixe `GestorInteligenteDeDemandas-Setup-0.2.22.exe` (7.25 MB).
SHA-256: `''' + novo_sha + '''`

Desinstale qualquer versao anterior antes (atalho antigo sera apagado junto). Os dados em `%APPDATA%\\GestorInteligenteDeDemandas\\dados\\` sao preservados.
''')

with open(r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.22-GH.md', 'w', encoding='utf-8') as f:
    f.write('''# v0.2.22 - FIX icone dos atalhos

**Bug**: atalho na Area de Trabalho e Menu Iniciar com icone GENERICO do Windows em vez da lampada MLOPES DEV.

**Causa**: `installer/resources/icon.ico` nao estava sendo copiado pro dist. `IconFilename` no .iss apontava pro .exe (icone generico do Neutralino).

**Fix**: build.mjs copia o icon.ico pro dist, e IconFilename aponta direto pro {app}\\icon.ico.

**Setup.exe**: 7.25 MB. SHA-256: `''' + novo_sha + '''`
''')

# Commit + push + release
os.chdir(r'E:\Projetos\LOPES FOCUS')
subprocess.run(['git', 'add', '-A'], capture_output=True, text=True)
res = subprocess.run(['git', '-c', 'user.email=marcio@gestor.local', '-c', 'user.name=Marcio Lopes', 'commit', '-m', 'v0.2.22: fix icone dos atalhos (icon.ico no dist + IconFilename direto)'], capture_output=True, text=True)
print('commit:', res.stdout.strip() or res.stderr.strip())
subprocess.run(['git', 'tag', '-f', 'v0.2.22'], capture_output=True, text=True)
res = subprocess.run(['git', 'push', 'origin', 'main', '--tags'], capture_output=True, text=True)
print('push:', 'OK' if res.returncode == 0 else res.stderr.strip())

res = subprocess.run(['gh', 'release', 'create', 'v0.2.22', '--title', 'v0.2.22 - FIX: icone lampada MLOPES DEV nos atalhos',
                       '--notes-file', r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.22-GH.md',
                       r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.22.exe',
                       r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu',
                       r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.22.md'],
                      capture_output=True, text=True)
print('gh release:', res.stdout.strip() or res.stderr.strip())

print()
print('Setup SHA:', novo_sha)
print('Setup size:', novo_size)
