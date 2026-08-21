#!/usr/bin/env python3
"""Le o .db do Gestor e mostra:
- usuarios
- areas
- sync_mudancas (CRITICO)
- sessoes ativas
"""
import sqlite3
import os

db_path = r'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas\dados\gestor.db'
if not os.path.exists(db_path):
    print('DB nao existe')
    raise SystemExit(1)
print(f'Tamanho: {os.path.getsize(db_path)} bytes')

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# IMPORTANTE: o sql.js grava timestamps como ISO 8601 strings, entao
# tudo string. Nao tem problema.

def show(label, sql):
    print(f'\n--- {label} ---')
    try:
        cur.execute(sql)
        cols = [d[0] for d in cur.description] if cur.description else []
        rows = cur.fetchall()
        print('  cols:', cols)
        for r in rows[:10]:
            print('  ', r)
        print(f'  total: {len(rows)}')
    except Exception as e:
        print(f'  ERRO: {e}')

show('usuarios', 'SELECT id, email, nome FROM usuarios')
show('sessoes', 'SELECT * FROM sessoes')
show('areas', 'SELECT id, usuario_id, nome, versao FROM areas')
show('projetos', 'SELECT id, usuario_id, nome, versao FROM projetos')
show('clientes', 'SELECT id, usuario_id, nome, versao FROM clientes')
show('tarefas (qtd)', 'SELECT COUNT(*) FROM tarefas')
show('sync_mudancas (CRITICO)', 'SELECT id, tabela, operacao, registro_id, versao, aplicada, criado_em FROM sync_mudancas ORDER BY criado_em DESC LIMIT 30')
show('sync_state', 'SELECT * FROM sync_state')
show('config (sync url/token)', "SELECT chave, valor FROM config WHERE chave LIKE '%sync%' OR chave LIKE '%wp%' OR chave LIKE '%token%' OR chave LIKE '%url%'")

conn.close()
