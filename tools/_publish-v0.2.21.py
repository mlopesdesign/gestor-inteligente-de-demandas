#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Publica v0.2.21: FIX do config incorreto no Setup.exe v0.2.20"""
import os
import shutil
import subprocess
import hashlib

nova_versao = '0.2.21'
novo_sha = hashlib.sha256(open(r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.21.exe', 'rb').read()).hexdigest().upper()
novo_size = os.path.getsize(r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.21.exe')

novas_notas = 'v0.2.21 - HOTFIX do config: a v0.2.20 foi publicada com neutralino.config.json dentro do Setup.exe tendo tokenSecurity=one-time e exportAuthInfo=false, o que causava NE_CL_IVCTOKN no app instalado. v0.2.21 garante tokenSecurity=none e exportAuthInfo=true no config embutido. Confirmado: instalacao fresh extrai o config com os valores corretos.'

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
    subprocess.run(['git', '-c', 'user.email=marcio@gestor.local', '-c', 'user.name=Marcio Lopes', 'commit', '-m', 'update.json v0.2.21'], capture_output=True, text=True)
    subprocess.run(['git', 'push', 'origin', 'gh-pages'], capture_output=True, text=True)
    print('gh-pages: OK')

# Release notes
with open(r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.21.md', 'w', encoding='utf-8') as f:
    f.write('''# v0.2.21 - HOTFIX config no Setup.exe

## O bug

A v0.2.20 tinha o arquivo `neutralino.config.json` (dentro do Setup.exe) com:
- `tokenSecurity: "one-time"` (devia ser `"none"`)
- `exportAuthInfo: false` (devia ser `true`)

Resultado: app instalado mostrava `NE_CL_IVCTOKN: Neutralinojs application cannot connect with the framework core using NL_TOKEN`.

## Causa

Publiquei a v0.2.20 sem revalidar o conteúdo do `neutralino.config.json` dentro do `dist/` antes de compilar o Setup.exe. O `build.mjs` copia o config que está no `E:\Projetos\LOPES FOCUS\neutralino.config.json` — mas em algum momento esse arquivo foi revertido para `one-time/false` (provavelmente por alguma tool de build anterior ou edição manual). Não percebi na hora de publicar.

## Correção

- `neutralino.config.json` da raiz forçado pra `tokenSecurity: none` + `exportAuthInfo: true`
- `build.mjs` recompilado
- Setup.exe recompilado e validado

## Instalacao

Baixe `GestorInteligenteDeDemandas-Setup-0.2.21.exe` (7.25 MB).
SHA-256: `''' + novo_sha + '''`

Desinstale qualquer versao anterior antes de instalar. Os dados em `%APPDATA%\\GestorInteligenteDeDemandas\\dados\\` sao preservados.
''')

with open(r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.21-GH.md', 'w', encoding='utf-8') as f:
    f.write('''# v0.2.21 - HOTFIX config

A v0.2.20 foi publicada com `neutralino.config.json` embutido tendo `tokenSecurity: one-time` (causa `NE_CL_IVCTOKN`). v0.2.21 corrige: `tokenSecurity: none` + `exportAuthInfo: true`.

**Instalacao**: `GestorInteligenteDeDemandas-Setup-0.2.21.exe` (7.25 MB)
**SHA-256**: `''' + novo_sha + '''`
''')

# Commit + push + release
os.chdir(r'E:\Projetos\LOPES FOCUS')
subprocess.run(['git', 'add', '-A'], capture_output=True, text=True)
res = subprocess.run(['git', '-c', 'user.email=marcio@gestor.local', '-c', 'user.name=Marcio Lopes', 'commit', '-m', 'v0.2.21: hotfix config no Setup.exe (tokenSecurity=none)'], capture_output=True, text=True)
print('commit:', res.stdout.strip() or res.stderr.strip())
subprocess.run(['git', 'tag', '-f', 'v0.2.21'], capture_output=True, text=True)
res = subprocess.run(['git', 'push', 'origin', 'main', '--tags'], capture_output=True, text=True)
print('push:', 'OK' if res.returncode == 0 else res.stderr.strip())

res = subprocess.run(['gh', 'release', 'create', 'v0.2.21', '--title', 'v0.2.21 - HOTFIX: config tokenSecurity=none no Setup',
                       '--notes-file', r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.21-GH.md',
                       r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.21.exe',
                       r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu',
                       r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.21.md'],
                      capture_output=True, text=True)
print('gh release:', res.stdout.strip() or res.stderr.strip())

print()
print('Setup SHA:', novo_sha)
print('Setup size:', novo_size)
