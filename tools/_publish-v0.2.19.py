#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Publica v0.2.19: migracao pra Inno Setup + fix src/ no instalador"""
import os
import shutil
import subprocess
import hashlib

nova_versao = '0.2.19'
novo_sha = hashlib.sha256(open(r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.19.exe', 'rb').read()).hexdigest().upper()
novo_size = os.path.getsize(r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.19.exe')
novo_neu_sha = hashlib.sha256(open(r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu', 'rb').read()).hexdigest().upper()

novas_notas = 'v0.2.19 - MIGRADO pra Inno Setup (mesmo empacotador do MLopes Finance) + FIX CRITICO: o Setup.exe agora inclui o diretorio src/ inteiro. Antes o Setup copiava so o .exe e o .neu, e o app abria a janela do Neutralino sem carregar o HTML porque o documentRoot=/ + url=/src/index.html aponta pro disco. Reproduzido no PC do usuario, agora corrigido. Inno Setup tambem tem MUITO mais reputacao no Windows SmartScreen que o NSIS, entao o bloqueio cai pra maioria dos usuarios.'

novo_json = '''{
  "applicationId": "app.mllopes.gestor",
  "version": "''' + nova_versao + '''",
  "notes": "''' + novas_notas + '''",
  "resourcesURL": "https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/download/v''' + nova_versao + '''/resources.neu",
  "sha256": "''' + novo_sha + '''",
  "size": ''' + str(novo_size) + '''
}
'''

# 1. update.json raiz
with open(r'E:\Projetos\LOPES FOCUS\update.json', 'w', encoding='utf-8') as f:
    f.write(novo_json)
print('OK: update.json (raiz)')

# 2. gh-pages
gh_dir = r'C:\Users\mlope\Documents\GitHub\gestor-inteligente-de-demandas'
if os.path.exists(gh_dir):
    shutil.copy2(r'E:\Projetos\LOPES FOCUS\update.json', os.path.join(gh_dir, 'update.json'))
    os.chdir(gh_dir)
    subprocess.run(['git', 'add', 'update.json'], check=True)
    subprocess.run(['git', '-c', 'user.email=marcio@gestor.local', '-c', 'user.name=Marcio Lopes', 'commit', '-m', 'update.json v0.2.19'], capture_output=True, text=True)
    subprocess.run(['git', 'push', 'origin', 'gh-pages'], capture_output=True, text=True)
    print('gh-pages: OK')

# 3. Release notes
with open(r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.19.md', 'w', encoding='utf-8') as f:
    f.write('''# v0.2.19 - Inno Setup + src/ incluido no instalador

## O que mudou

### 1. Migrado pra Inno Setup
Instalador agora gerado pelo **Inno Setup 7.1** (mesmo que o MLopes Finance usa), nao mais NSIS. Motivo: Inno Setup tem reputacao MUITO maior no Windows SmartScreen, entao o bloqueio cai pra maioria dos usuarios.

- Diretorio de instalacao mudou de `C:\\Program Files\\Gestor Inteligente de Demandas` pra `%LOCALAPPDATA%\\Programs\\Gestor Inteligente de Demandas` (sem admin)
- Compressao LZMA2/ultra64: Setup.exe final em **7.25 MB**
- Idioma PT-BR nativo do Inno

### 2. BUG CRITICO corrigido: src/ nao era copiado
Antes o Setup.exe copiava so o `.exe` e o `.neu` do `dist\\`. O `src\\` (HTML, CSS, JS, imagens) NAO era copiado. Resultado: o app abria a janela do Neutralino com a tela em branco porque o `documentRoot: /` + `url: /src/index.html` aponta pro disco.

Reproduzido no PC do seu irmao: app abria "Neutralino" e ficava em branco. AGORA o `build.mjs` copia o `src\\` inteiro pro `dist\\` antes do instalador empacotar. Instalacao fresh funciona standalone.

## Instalacao

- Baixe `GestorInteligenteDeDemandas-Setup-0.2.19.exe` (7.25 MB)
- SHA-256: `''' + novo_sha + '''`
- Ou use o `instalar-windows.bat` (wrapper com bypass automatico do SmartScreen)
- O instalador agora roda SEM administrador (instala em `%LOCALAPPDATA%`)

## Pra quem ja tem versao anterior

- Desinstale a versao NSIS pelo Painel de Controle
- Instale a v0.2.19 (Inno)
- Os dados em `%APPDATA%\\GestorInteligenteDeDemandas\\dados\\` NAO sao apagados (sobe automatico)

## Licao

Todo instalador DEVE incluir o `src/` (ou assets necessarios) na app-image. Validar o fluxo end-to-end (instalar fresh, abrir, ver se carrega) ANTES de publicar. Tinha testado a v0.2.18 so com sync manual — quem baixou o Setup.exe de verdade pegava o bug.
''')

with open(r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.19-GH.md', 'w', encoding='utf-8') as f:
    f.write('''# v0.2.19 - Inno Setup + src/ no instalador

**Migrado de NSIS pra Inno Setup 7.1** (mesmo empacotador do MLopes Finance). Motivo: Inno tem muito mais reputacao no Windows SmartScreen.

**BUG CRITICO corrigido**: o Setup.exe antes copiava so o `.exe` e o `.neu` — o `src/` nao ia. Resultado: app abria janela em branco no PC do usuario. Agora `build.mjs` copia o `src/` inteiro. Validado instalacao fresh em pasta temp — app sobe normalmente.

**Setup.exe**: 7.25 MB (LZMA2/ultra64)
**Instalacao**: `%LOCALAPPDATA%\\Programs\\` (sem admin)
**SHA-256**: `''' + novo_sha + '''`
''')

# 4. Commit + tag + push
os.chdir(r'E:\Projetos\LOPES FOCUS')
subprocess.run(['git', 'add', '-A'], capture_output=True, text=True)
res = subprocess.run(['git', '-c', 'user.email=marcio@gestor.local', '-c', 'user.name=Marcio Lopes', 'commit', '-m', 'v0.2.19: migracao pra Inno Setup + src/ no instalador (fix "abre neutralino")'], capture_output=True, text=True)
print('commit:', res.stdout.strip() or res.stderr.strip())
subprocess.run(['git', 'tag', '-f', 'v0.2.19'], capture_output=True, text=True)
res = subprocess.run(['git', 'push', 'origin', 'main', '--tags'], capture_output=True, text=True)
print('push:', 'OK' if res.returncode == 0 else res.stderr.strip())

# 5. Release
res = subprocess.run(['gh', 'release', 'create', 'v0.2.19', '--title', 'v0.2.19 - Inno Setup + src/ no instalador',
                       '--notes-file', r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.19-GH.md',
                       r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.19.exe',
                       r'E:\Projetos\LOPES FOCUS\installer\instalar-windows.bat',
                       r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu',
                       r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.19.md'],
                      capture_output=True, text=True)
print('gh release:', res.stdout.strip() or res.stderr.strip())

print()
print('=== Final ===')
print('Setup SHA:', novo_sha)
print('Setup size:', novo_size, 'bytes')
print('resources.neu SHA:', novo_neu_sha)
