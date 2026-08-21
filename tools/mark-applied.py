#!/usr/bin/env python3
"""Marca sync_mudancas pendentes como aplicadas e atualiza sync_state.json"""
import sqlite3
import json
import os

DB = r'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas\dados\gestor.db'
SYNC_STATE = r'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas\dados\sync_state.json'

conn = sqlite3.connect(DB)
cur = conn.cursor()

# Marca todas pendentes como aplicadas
cur.execute("UPDATE sync_mudancas SET aplicada = 1 WHERE aplicada = 0")
print('marcadas como aplicadas:', cur.rowcount)

# Pega o max id
cur.execute("SELECT MAX(id) FROM sync_mudancas")
max_id = cur.fetchone()[0]
print('max id:', max_id)

conn.commit()
conn.close()

# Atualiza sync_state
with open(SYNC_STATE, 'r') as f:
    state = json.load(f)
state['ultimo_push_id'] = max_id
state['ultimo_sync'] = '2026-08-21T07:55:00.000Z'
with open(SYNC_STATE, 'w') as f:
    json.dump(state, f, indent=2)
print('sync_state atualizado:')
print('  ultimo_push_id =', max_id)
print('  ultimo_sync =', state['ultimo_sync'])
