#!/usr/bin/env python3
"""Faz o PUSH do desktop para o WP, simulando o que o sync.js faz.
Le as sync_mudancas do .db do Gestor e envia via /sync/push."""
import sqlite3
import json
import os
import sys
import urllib.request
import urllib.error

DB_PATH = r'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas\dados\gestor.db'
SYNC_STATE_PATH = r'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas\dados\sync_state.json'
WP_BASE = 'https://tools.mlopesdesign.com.br/wp-json/gestor/v1'

# Token do Marcio
TOKEN = 'deb77efe7c8a7bc5e4cf8ad041d02524e2387160ffabe26835c59bacb2e8b2aa'

# Conectar no .db do Gestor
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Pega o dispositivo_id (pode estar no sync_state ou sessoes)
state = {}
if os.path.exists(SYNC_STATE_PATH):
    with open(SYNC_STATE_PATH, 'r') as f:
        try: state = json.load(f)
        except: pass
print('sync_state:', state)

dispositivo_id = state.get('wp_dispositivo_id')
if not dispositivo_id:
    # pega do sessoes
    cur.execute("SELECT dispositivo_id FROM sessoes ORDER BY criada_em DESC LIMIT 1")
    row = cur.fetchone()
    if row: dispositivo_id = row[0]
print('dispositivo_id:', dispositivo_id)

ultimo_push_id = state.get('ultimo_push_id', 0)
print('ultimo_push_id:', ultimo_push_id)

# Pega usuario_id do sessoes
cur.execute("SELECT usuario_id FROM sessoes ORDER BY criada_em DESC LIMIT 1")
uid = cur.fetchone()[0]
print('usuario_id:', uid)

# Pega mudancas pendentes
cur.execute("""
    SELECT id, tabela, operacao, registro_id, versao, payload_json
    FROM sync_mudancas
    WHERE usuario_id = ? AND id > ? AND aplicada = 0
    ORDER BY id ASC LIMIT 200
""", (uid, ultimo_push_id))
rows = cur.fetchall()
print(f'mudancas pendentes: {len(rows)}')
for r in rows:
    print(f'  id={r[0]} tabela={r[1]} op={r[2]} regId={r[3]} versao={r[4]}')

# Monta payload no formato que o WP espera
mutacoes = []
for row in rows:
    mid, tabela, operacao, regId, versao, payloadJ = row
    try:
        payload = json.loads(payloadJ)
    except:
        payload = {}
    mutacoes.append({
        'tabela': str(tabela),
        'operacao': str(operacao),
        'registro_id': str(regId),
        'versao': int(versao),
        'payload': payload,
    })

if not mutacoes:
    print('nada para enviar')
    sys.exit(0)

body = {
    'dispositivo_id': dispositivo_id,
    'mutacoes': mutacoes,
}

body_json = json.dumps(body, ensure_ascii=False).encode('utf-8')
print(f'payload: {len(body_json)} bytes')
print('---')
print(json.dumps(body, ensure_ascii=False, indent=2)[:500])
print('---')

req = urllib.request.Request(
    f'{WP_BASE}/sync/push',
    data=body_json,
    method='POST',
    headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {TOKEN}',
        'User-Agent': 'GestorDesktop/0.2.47',
    }
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        text = resp.read().decode('utf-8')
        print(f'STATUS: {resp.status}')
        print(f'RESP: {text[:1000]}')
except urllib.error.HTTPError as e:
    text = e.read().decode('utf-8', errors='replace')
    print(f'HTTP ERROR: {e.code}')
    print(f'BODY: {text[:2000]}')

conn.close()
