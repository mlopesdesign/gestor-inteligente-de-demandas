#!/usr/bin/env python3
import sqlite3
db = r'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas\dados\gestor.db'
conn = sqlite3.connect(db)
cur = conn.cursor()
cur.execute('SELECT tabela, operacao, registro_id, versao, aplicada, criado_em FROM sync_mudancas ORDER BY criado_em')
for r in cur.fetchall():
    print(r)
print('---')
# contar pendentes
cur.execute("SELECT COUNT(*) FROM sync_mudancas WHERE aplicada = 0")
print('pendentes (aplicada=0):', cur.fetchone()[0])
cur.execute("SELECT COUNT(*) FROM sync_mudancas WHERE aplicada = 1")
print('aplicadas (aplicada=1):', cur.fetchone()[0])
conn.close()
