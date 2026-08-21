#!/usr/bin/env python3
import urllib.request
import json

TOKEN = 'deb77efe7c8a7bc5e4cf8ad041d02524e2387160ffabe26835c59bacb2e8b2aa'
body = json.dumps({
    'dispositivo_id': 'desktop-01m0hfgydzqjs3ghw0bbrkyt0c',
    'since': 0,
    'limit': 50
}).encode('utf-8')

req = urllib.request.Request(
    'https://tools.mlopesdesign.com.br/wp-json/gestor/v1/sync/pull',
    data=body,
    method='POST',
    headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN}
)
try:
    with urllib.request.urlopen(req) as r:
        text = r.read().decode('utf-8')
        data = json.loads(text)
        print('success:', data.get('success'))
        mudancas = data.get('data', {}).get('mudancas', [])
        print('total mudancas no WP:', len(mudancas))
        print()
        for m in mudancas:
            p = m.get('payload', {})
            nome = p.get('nome') or p.get('titulo') or '(sem nome)'
            print('  ' + m['tabela'].ljust(10) + ' ' + m['operacao'].ljust(7) + ' ' + m['registro_id'] + '  -  ' + nome)
except urllib.error.HTTPError as e:
    print('HTTP', e.code, ':', e.read().decode('utf-8', errors='replace')[:500])
