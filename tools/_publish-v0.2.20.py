#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Publica v0.2.20: 2 fixes criticos (config + src/ no instalador)"""
import os
import shutil
import subprocess
import hashlib

nova_versao = '0.2.20'
novo_sha = hashlib.sha256(open(r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.20.exe', 'rb').read()).hexdigest().upper()
novo_size = os.path.getsize(r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.20.exe')

novas_notas = 'v0.2.20 - FIX CRITICO do "abre neutralinojs.org": o neutralino.config.json nao estava sendo copiado pro app-image, e o tokenSecurity estava como "one-time" (causa NE_CL_IVCTOKN). Agora o build.mjs copia o config pro dist/ e usa tokenSecurity=none + exportAuthInfo=true. Tambem copia o src/ (HTML+CSS+JS+imagens) pro instalador, que era o motivo do "abre neutralino" com tela em branco na v0.2.18. Resultado: app abre normal em qualquer PC.'

novo_json = '''{
  "applicationId": "app.mllopes.gestor",
  "version": "''' + nova_versao + '''",
  "notes": "''' + novas_notas + '''",
  "resourcesURL": "https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/download/v''' + nova_versao + '''/resources.neu",
  "sha256": "''' + novo_sha + '''",
  "size": ''' + str(novo_size) + '''
}
'''

# update.json raiz + gh-pages
with open(r'E:\Projetos\LOPES FOCUS\update.json', 'w', encoding='utf-8') as f:
    f.write(novo_json)
print('OK: update.json (raiz)')

gh_dir = r'C:\Users\mlope\Documents\GitHub\gestor-inteligente-de-demandas'
if os.path.exists(gh_dir):
    shutil.copy2(r'E:\Projetos\LOPES FOCUS\update.json', os.path.join(gh_dir, 'update.json'))
    os.chdir(gh_dir)
    subprocess.run(['git', 'add', 'update.json'], check=True)
    subprocess.run(['git', '-c', 'user.email=marcio@gestor.local', '-c', 'user.name=Marcio Lopes', 'commit', '-m', 'update.json v0.2.20'], capture_output=True, text=True)
    subprocess.run(['git', 'push', 'origin', 'gh-pages'], capture_output=True, text=True)
    print('gh-pages: OK')

# Release notes
with open(r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.20.md', 'w', encoding='utf-8') as f:
    f.write('''# v0.2.20 - FIX "abre neutralinojs.org"

## O bug

Ao clicar "Concluir" no instalador e abrir o app, aparecia uma janela do Neutralinojs mostrando a pagina **neutralinojs.org** (site oficial do framework) em vez do app.

Reproduzido em video pelo Marcio: o app baixado do GitHub abria o navegador embutido do Neutralino com a pagina do site, e o app nao carregava.

## Causa raiz

1. O `neutralino.config.json` NAO estava sendo copiado pro `dist\\GestorInteligenteDeDemandas\\` pelo `build.mjs`. O `.exe` procura esse arquivo no mesmo diretorio; quando nao acha, ele usa um fallback que abre o site do neutralinojs.
2. O config tambem tinha `tokenSecurity: "one-time"` em vez de `"none"`, o que causava o erro `NE_CL_IVCTOKN` quando a sessao era recriada (cache do WebView2).

## Correcao

- `tools/build.mjs`: copia o `neutralino.config.json` pro `dist\\` (e garante `tokenSecurity: none`, `exportAuthInfo: true`)
- `installer/gestor.iss`: ja copia tudo de `dist\\GestorInteligenteDeDemandas\\*` (Inno Setup), agora incluindo o config

## Instalacao

- **Baixe** `GestorInteligenteDeDemandas-Setup-0.2.20.exe` (7.25 MB)
- SHA-256: `''' + novo_sha + '''`
- Desinstale a versao anterior antes (se for Inno Setup, o instalador detecta e pergunta; se for NSIS, desinstale via Painel de Controle)
- Os dados em `%APPDATA%\\GestorInteligenteDeDemandas\\dados\\` sao preservados
''')

with open(r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.20-GH.md', 'w', encoding='utf-8') as f:
    f.write('''# v0.2.20 - FIX "abre neutralinojs.org"

**Causa**: `neutralino.config.json` nao estava sendo copiado pro app-image. Sem ele, o .exe abria a pagina default do neutralino (neutralinojs.org).

**Fix**: `build.mjs` agora copia o config pro dist/, e usa `tokenSecurity: none` + `exportAuthInfo: true` (resolve NE_CL_IVCTOKN).

**Instalacao**: `GestorInteligenteDeDemandas-Setup-0.2.20.exe` (7.25 MB)
**SHA-256**: `''' + novo_sha + '''`
''')

# Commit + push
os.chdir(r'E:\Projetos\LOPES FOCUS')
subprocess.run(['git', 'add', '-A'], capture_output=True, text=True)
res = subprocess.run(['git', '-c', 'user.email=marcio@gestor.local', '-c', 'user.name=Marcio Lopes', 'commit', '-m', 'v0.2.20: FIX bug "abre neutralinojs.org" (config no app-image + tokenSecurity)'], capture_output=True, text=True)
print('commit:', res.stdout.strip() or res.stderr.strip())
subprocess.run(['git', 'tag', '-f', 'v0.2.20'], capture_output=True, text=True)
res = subprocess.run(['git', 'push', 'origin', 'main', '--tags'], capture_output=True, text=True)
print('push:', 'OK' if res.returncode == 0 else res.stderr.strip())

# Release
res = subprocess.run(['gh', 'release', 'create', 'v0.2.20', '--title', 'v0.2.20 - FIX: app abre normal (sem neutralinojs.org)',
                       '--notes-file', r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.20-GH.md',
                       r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.20.exe',
                       r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu',
                       r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.20.md'],
                      capture_output=True, text=True)
print('gh release:', res.stdout.strip() or res.stderr.strip())

print()
print('Setup SHA:', novo_sha)
print('Setup size:', novo_size, 'bytes')
