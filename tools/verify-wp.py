#!/usr/bin/env python3
"""Verifica o estado do WP via /sync/pull"""
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
    headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {TOKEN}',
    }
)

with urllib.request.urlopen(req) as r:
    text = r.read().decode('utf-8')
    data = json.loads(text)
    print('success:', data.get('success'))
    print('mudancas no WP (total):', len(data.get('data', {}).get('mudancas', [])))
    print()
    print('=== DETALHES ===')
    for m in data.get('data', {}).get('mudancas', []):
        p = m.get('payload', {})
        nome = p.get('nome') or p.get('titulo') or '(sem nome)'
        print(f'  {m["tabela"]:<10} {m["operacao"]:<7} {m["registro_id"]}  -  {nome}')
