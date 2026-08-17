#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Publica versao final v0.2.17 (sem auto-click)"""
import os
import shutil
import subprocess

nova_versao = '0.2.17'
novo_sha = '35F3A0FFBAD6A58365B4901F4B81969E7B857BEAE244AADFBFA7B97C67B56CE6'
novo_size = os.path.getsize(r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.17.exe')
novo_neu_sha = 'CB48E9350C77F683AC09368B1186D2E48BD8187704F1B0C1FE84C7385A250E3C'

novas_notas = 'v0.2.17 - FIX CRITICO do auto-update: a v0.2.16 ainda tinha fallback que abria o navegador padrao (Edge) com a URL do .neu no GitHub (ou neutralinojs.org em casos com checkForUpdates). Reescrevi COMPLETAMENTE: agora o auto-update usa SOMENTE PowerShell Invoke-WebRequest via Neutralino.os.execCommand - nunca mais abre navegador. Tambem removi as funcoes verificarUpdate/aplicarUpdate do ambiente.js que ainda chamavam Neutralino.updater.checkForUpdates(). Testado end-to-end: app em 0.2.15, clica Atualizar agora, baixa 0.2.17 via PowerShell, valida, move, reinicia. ZERO navegador aberto.'

novo_json = '''{
  "applicationId": "app.mllopes.gestor",
  "version": "''' + nova_versao + '''",
  "notes": "''' + novas_notas + '''",
  "resourcesURL": "https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/download/v''' + nova_versao + '''/resources.neu",
  "sha256": "''' + novo_sha + '''",
  "size": ''' + str(novo_size) + '''
}
'''

# Atualiza update.json (raiz)
root_json = r'E:\Projetos\LOPES FOCUS\update.json'
with open(root_json, 'w', encoding='utf-8') as f:
    f.write(novo_json)
print('OK: update.json (raiz)')

# Atualiza gh-pages
gh_dir = r'C:\Users\mlope\Documents\GitHub\gestor-inteligente-de-demandas'
if os.path.exists(gh_dir):
    dst_json = os.path.join(gh_dir, 'update.json')
    shutil.copy2(root_json, dst_json)
    os.chdir(gh_dir)
    subprocess.run(['git', 'add', 'update.json'], check=True)
    res = subprocess.run(['git', '-c', 'user.email=marcio@gestor.local', '-c', 'user.name=Marcio Lopes', 'commit', '-m', 'update.json v0.2.17 (final)'], capture_output=True, text=True)
    print('gh-pages commit:', res.stdout.strip())
    res = subprocess.run(['git', 'push', 'origin', 'gh-pages'], capture_output=True, text=True)
    print('gh-pages push:', res.stdout.strip())
else:
    print('WARN: gh-pages dir nao existe')

# Deleta assets antigos da release v0.2.17 e sobe os novos
os.chdir(r'E:\Projetos\LOPES FOCUS')
print()
print('=== Deletando assets antigos da v0.2.17 ===')
for asset in ['GestorInteligenteDeDemandas-Setup-0.2.17.exe', 'instalar-windows.bat', 'resources.neu']:
    res = subprocess.run(['gh', 'release', 'delete-asset', 'v0.2.17', asset, '--yes'], capture_output=True, text=True)
    print(f'  {asset}: {res.stdout.strip() or "deleted"}{res.stderr and " | " + res.stderr.strip() or ""}')

print()
print('=== Subindo novos assets ===')
# instalar-windows.bat - mantem o mesmo
src_bat = r'E:\Projetos\LOPES FOCUS\installer\instalar-windows.bat'
if os.path.exists(src_bat):
    res = subprocess.run(['gh', 'release', 'upload', 'v0.2.17', src_bat], capture_output=True, text=True)
    print(f'  instalar-windows.bat: {res.stdout.strip() or "uploaded"}{res.stderr and " | " + res.stderr.strip() or ""}')

# Setup.exe novo
res = subprocess.run(['gh', 'release', 'upload', 'v0.2.17', r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.17.exe', '--clobber'], capture_output=True, text=True)
print(f'  Setup.exe: {res.stdout.strip() or "uploaded"}{res.stderr and " | " + res.stderr.strip() or ""}')

# resources.neu novo
res = subprocess.run(['gh', 'release', 'upload', 'v0.2.17', r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu', '--clobber'], capture_output=True, text=True)
print(f'  resources.neu: {res.stdout.strip() or "uploaded"}{res.stderr and " | " + res.stderr.strip() or ""}')

# Release notes
res = subprocess.run(['gh', 'release', 'upload', 'v0.2.17', r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.17.md', '--clobber'], capture_output=True, text=True)
print(f'  RELEASE-NOTES: {res.stdout.strip() or "uploaded"}{res.stderr and " | " + res.stderr.strip() or ""}')

print()
print('=== Assets finais ===')
res = subprocess.run(['gh', 'release', 'view', 'v0.2.17', '--json', 'assets', '-q', '.assets[].name'], capture_output=True, text=True)
print(res.stdout)
