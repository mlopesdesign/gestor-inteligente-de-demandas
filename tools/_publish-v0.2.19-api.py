#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Publica v0.2.19 via GitHub REST API (contorna 503 do gh CLI)"""
import os
import subprocess
import json
import urllib.request
import urllib.error

# Pega o token do gh CLI
res = subprocess.run(['gh', 'auth', 'token'], capture_output=True, text=True)
token = res.stdout.strip()
if not token:
    print('ERRO: nao consegui pegar o token do gh CLI')
    raise SystemExit(1)
print('token OK (len=' + str(len(token)) + ')')

# Le as release notes
with open(r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.19-GH.md', 'r', encoding='utf-8') as f:
    notes = f.read()

# Cria a release via API
url = 'https://api.github.com/repos/mlopesdesign/gestor-inteligente-de-demandas/releases'
body = json.dumps({
    'tag_name': 'v0.2.19',
    'target_commitish': 'main',
    'name': 'v0.2.19 - Inno Setup + src/ no instalador',
    'body': notes,
    'draft': False,
    'prerelease': False,
}, ensure_ascii=False).encode('utf-8')

req = urllib.request.Request(url, data=body, method='POST', headers={
    'Authorization': f'token {token}',
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': 'publish-script',
})

try:
    with urllib.request.urlopen(req) as r:
        resp = json.loads(r.read().decode('utf-8'))
    print('Release criada:', resp['html_url'])
    upload_url = resp['upload_url'].replace('{?name,label}', '')
    release_id = resp['id']
except urllib.error.HTTPError as e:
    print('ERRO', e.code, e.read().decode('utf-8'))
    raise SystemExit(1)

# Upload assets
assets = [
    (r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.19.exe', 'GestorInteligenteDeDemandas-Setup-0.2.19.exe'),
    (r'E:\Projetos\LOPES FOCUS\installer\instalar-windows.bat', 'instalar-windows.bat'),
    (r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu', 'resources.neu'),
    (r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.19.md', 'RELEASE-NOTES-v0.2.19.md'),
]

for path, name in assets:
    print(f'  upload: {name} ...', end=' ', flush=True)
    with open(path, 'rb') as f:
        data = f.read()
    # GitHub requer Content-Length
    asset_url = upload_url + '?name=' + urllib.parse.quote(name)
    req = urllib.request.Request(asset_url, data=data, method='POST', headers={
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/octet-stream',
        'Content-Length': str(len(data)),
        'User-Agent': 'publish-script',
    })
    try:
        with urllib.request.urlopen(req) as r:
            json.loads(r.read().decode('utf-8'))
        print('OK')
    except urllib.error.HTTPError as e:
        print(f'ERRO {e.code}: {e.read().decode("utf-8")[:200]}')

print()
print('=== Final ===')
print('Release:', resp['html_url'])
