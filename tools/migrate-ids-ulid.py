#!/usr/bin/env python3
"""Migrar IDs antigos (01AREAT1, 01TASKxxx) para ULIDs validos (26 chars Crockford Base32).
Gera novos IDs deterministicos (mesmo ID pra mesmo input) e atualiza:
  - areas.id
  - tarefas.id e tarefas.area_id
  - sync_mudancas.registro_id (e payload_json)
  - clientes.id (se houver)
Depois enfileira UPSERT pro WP via /sync/push.
"""
import sqlite3
import json
import os
import hashlib
import sys
import urllib.request
import urllib.error

DB_PATH = r'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas\dados\gestor.db'
SYNC_STATE_PATH = r'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas\dados\sync_state.json'
WP_BASE = 'https://tools.mlopesdesign.com.br/wp-json/gestor/v1'
TOKEN = 'deb77efe7c8a7bc5e4cf8ad041d02524e2387160ffabe26835c59bacb2e8b2aa'

# Crockford Base32 (sem I, L, O, U) - igual ao ULID
CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

def ulid_from_seed(seed: str) -> str:
    """Gera ULID deterministico de 26 chars a partir de uma seed.
    Usa SHA256 da seed e converte primeiros 130 bits (16 bytes + 2 nibbles) pra base32.
    Nao e' ULID real (sem timestamp monotonic), mas passa o is_valid do PHP.
    """
    h = hashlib.sha256(seed.encode('utf-8')).digest()
    # Pega 16 bytes = 128 bits = 26 chars base32
    # converter 128 bits pra 26 chars base32 (5 bits por char)
    bits = int.from_bytes(h[:16], 'big')
    out = []
    for i in range(25, -1, -1):
        out.append(CROCKFORD[(bits >> (i * 5)) & 0x1F])
    return ''.join(out)

# Testa
for s in ['TESTE1', 'TESTE2', '01AREAT1', '01TASK3AZGDQ190K']:
    print(s, '->', ulid_from_seed(s))

print()
print('--- Migrando banco ---')
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Pega o usuario_id
cur.execute("SELECT usuario_id FROM sessoes ORDER BY criada_em DESC LIMIT 1")
uid = cur.fetchone()[0]
print('usuario_id:', uid)

# Mapeia IDs antigos -> novos (areas)
cur.execute("SELECT id, nome FROM areas WHERE usuario_id = ?", (uid,))
areas_antigos = cur.fetchall()
print(f'areas: {len(areas_antigos)}')
area_map = {}
for old_id, nome in areas_antigos:
    if len(old_id) == 26 and all(c in CROCKFORD for c in old_id):
        # ja e ULID valido
        new_id = old_id
    else:
        new_id = ulid_from_seed(f'area:{uid}:{old_id}')
    area_map[old_id] = new_id
    if old_id != new_id:
        print(f'  {old_id} -> {new_id} ({nome})')

# Mapeia IDs antigos -> novos (tarefas)
cur.execute("SELECT id, area_id FROM tarefas WHERE usuario_id = ?", (uid,))
tarefas_antigas = cur.fetchall()
print(f'tarefas: {len(tarefas_antigas)}')
tarefa_map = {}
for old_id, area_id in tarefas_antigas:
    if len(old_id) == 26 and all(c in CROCKFORD for c in old_id):
        new_id = old_id
    else:
        new_id = ulid_from_seed(f'tarefa:{uid}:{old_id}')
    tarefa_map[old_id] = new_id
    if old_id != new_id:
        new_area = area_map.get(area_id, area_id)
        print(f'  {old_id} -> {new_id} (area {area_id} -> {new_area})')

# Mapeia IDs antigos -> novos (clientes)
cur.execute("SELECT id FROM clientes WHERE usuario_id = ?", (uid,))
clientes_antigos = cur.fetchall()
print(f'clientes: {len(clientes_antigos)}')
cliente_map = {}
for (old_id,) in clientes_antigos:
    if len(old_id) == 26 and all(c in CROCKFORD for c in old_id):
        new_id = old_id
    else:
        new_id = ulid_from_seed(f'cliente:{uid}:{old_id}')
    cliente_map[old_id] = new_id

# Atualiza o banco
print()
print('--- Aplicando migration ---')
for old, new in area_map.items():
    if old != new:
        cur.execute("UPDATE areas SET id = ? WHERE id = ?", (new, old))
        print(f'  UPDATE areas SET id={new} WHERE id={old}')
for old, new in tarefa_map.items():
    if old != new:
        cur.execute("UPDATE tarefas SET id = ? WHERE id = ?", (new, old))
        print(f'  UPDATE tarefas SET id={new} WHERE id={old}')
for old, new in area_map.items():
    if old != new:
        cur.execute("UPDATE tarefas SET area_id = ? WHERE area_id = ?", (new, old))
        print(f'  UPDATE tarefas SET area_id={new} WHERE area_id={old}')
for old, new in cliente_map.items():
    if old != new:
        cur.execute("UPDATE clientes SET id = ? WHERE id = ?", (new, old))
        print(f'  UPDATE clientes SET id={new} WHERE id={old}')

# Atualiza sync_mudancas: dropa as mudancas antigas com IDs invalidos
# e cria novas com os IDs novos
print()
print('--- Re-enfileirando sync_mudancas com IDs novos ---')
cur.execute("DELETE FROM sync_mudancas WHERE aplicada = 0")
print('  delete sync_mudancas pendentes')

def enfileira(tabela, registro_id, payload):
    payload_json = json.dumps(payload, ensure_ascii=False)
    cur.execute("""
        INSERT INTO sync_mudancas(usuario_id, dispositivo_id, tabela, registro_id, operacao, versao, payload_json, criado_em, aplicada)
        VALUES (?, ?, ?, ?, 'UPSERT', 1, ?, ?, 0)
    """, (uid, 'desktop-01m0hfgydzqjs3ghw0bbrkyt0c', tabela, registro_id, payload_json, '2026-08-21T07:50:00.000Z'))

# Areas
cur.execute("SELECT id, usuario_id, dono_id, nome, cor, criado_em, atualizado_em, versao FROM areas WHERE usuario_id = ?", (uid,))
for row in cur.fetchall():
    aid, u, d, n, c, ce, ae, v = row
    enfileira('areas', aid, {'id': aid, 'usuario_id': u, 'dono_id': d, 'nome': n, 'cor': c,
                              'criado_em': ce, 'atualizado_em': ae, 'versao': v})
    print(f'  enfileirada area {aid}')

# Tarefas
cur.execute("SELECT id, usuario_id, dono_id, titulo, status, prioridade, nivel_cobranca, area_id, vencimento_em, criado_em, atualizado_em, versao FROM tarefas WHERE usuario_id = ?", (uid,))
for row in cur.fetchall():
    tid, u, d, titulo, status, prioridade, nivel, area_id, venc, ce, ae, v = row
    enfileira('tarefas', tid, {'id': tid, 'usuario_id': u, 'dono_id': d, 'titulo': titulo, 'status': status,
                                'prioridade': prioridade, 'nivel_cobranca': nivel, 'area_id': area_id,
                                'vencimento_em': venc, 'criado_em': ce, 'atualizado_em': ae, 'versao': v})
    print(f'  enfileirada tarefa {tid}')

# Clientes
cur.execute("SELECT id, usuario_id, dono_id, nome, organizacao, contatos_json, observacoes, status, criado_em, atualizado_em, versao FROM clientes WHERE usuario_id = ?", (uid,))
for row in cur.fetchall():
    cid, u, d, n, org, contatos, obs, status, ce, ae, v = row
    enfileira('clientes', cid, {'id': cid, 'usuario_id': u, 'dono_id': d, 'nome': n, 'organizacao': org,
                                 'contatos_json': contatos, 'observacoes': obs, 'status': status,
                                 'criado_em': ce, 'atualizado_em': ae, 'versao': v})
    print(f'  enfileirado cliente {cid}')

conn.commit()

# Verificar
cur.execute("SELECT COUNT(*) FROM sync_mudancas WHERE aplicada = 0")
print(f'\npendentes agora: {cur.fetchone()[0]}')

cur.execute("SELECT id, tabela, operacao, registro_id FROM sync_mudancas WHERE aplicada = 0")
for row in cur.fetchall():
    print(' ', row)

conn.close()
print()
print('--- Banco migrado. Pode fazer PUSH agora. ---')
