#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Atualiza update.json para a nova versão"""
import os
import sys

nova_versao = '0.2.17'
novo_sha = '9F290545EC185AFD63778EB333E59A455572B16ACBBF7EA5E30EBA0EBB493088'
novo_size = os.path.getsize(r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.17.exe')
novo_neu_sha = 'TBD'  # vamos calcular do .neu novo

neu_path = r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu'
if os.path.exists(neu_path):
    import hashlib
    with open(neu_path, 'rb') as f:
        novo_neu_sha = hashlib.sha256(f.read()).hexdigest().upper()
novo_neu_size = os.path.getsize(neu_path) if os.path.exists(neu_path) else 0

novas_notas = 'v0.2.17 - FIX CRÍTICO do auto-update: a v0.2.16 ainda tinha fallback que abria o navegador padrão (Edge) com a URL do .neu no GitHub (ou neutralinojs.org em casos com checkForUpdates). Reescrevi COMPLETAMENTE: agora o auto-update usa SOMENTE PowerShell Invoke-WebRequest via Neutralino.os.execCommand — nunca mais abre navegador. Também removi as funções verificarUpdate/aplicarUpdate do ambiente.js que ainda chamavam Neutralino.updater.checkForUpdates().'

novo_json = '''{
  "applicationId": "app.mllopes.gestor",
  "version": "''' + nova_versao + '''",
  "notes": "''' + novas_notas + '''",
  "resourcesURL": "https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/download/v''' + nova_versao + '''/resources.neu",
  "sha256": "''' + novo_sha + '''",
  "size": ''' + str(novo_size) + '''
}
'''

# Salva na raiz
root = r'E:\Projetos\LOPES FOCUS\update.json'
with open(root, 'w', encoding='utf-8') as f:
    f.write(novo_json)
print('OK: update.json (raiz) v' + nova_versao)

# Salva em .trash-gh-pages (que é o que vai pro gh-pages)
gh = r'E:\Projetos\LOPES FOCUS\.trash-gh-pages\update.json'
if os.path.exists(gh):
    with open(gh, 'w', encoding='utf-8') as f:
        f.write(novo_json)
    print('OK: update.json (.trash-gh-pages) v' + nova_versao)
else:
    print('WARN: .trash-gh-pages/update.json não existe')

# Salva em C:\Users\mlope\Documents\GitHub\gestor-inteligente-de-demandas\update.json
gh2 = r'C:\Users\mlope\Documents\GitHub\gestor-inteligente-de-demandas\update.json'
if os.path.exists(os.path.dirname(gh2)):
    with open(gh2, 'w', encoding='utf-8') as f:
        f.write(novo_json)
    print('OK: update.json (C:\\Users\\mlope\\Documents\\GitHub) v' + nova_versao)
else:
    print('WARN: C:\\Users\\mlope\\Documents\\GitHub\\gestor-inteligente-de-demandas não existe')

print('Setup.exe SHA256:', novo_sha)
print('Setup.exe size:', novo_size, 'bytes')
print('resources.neu SHA256:', novo_neu_sha)
print('resources.neu size:', novo_neu_size, 'bytes')
