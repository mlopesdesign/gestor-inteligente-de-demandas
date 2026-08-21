"""Testa a migration one-shot diretamente no banco do Gestor."""
import sqlite3
import json
from pathlib import Path

db_path = Path(r'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas\dados\gestor.db')
con = sqlite3.connect(str(db_path))
cur = con.cursor()

uid = '01DEMOO3U43DLDXN'

# Verifica se ja enfileirou
count = cur.execute("SELECT COUNT(*) FROM sync_mudancas WHERE usuario_id=? AND tabela=?", (uid, 'areas')).fetchone()[0]
print(f"areas ja enfileiradas: {count}")

# Faz o que a migration faz
tabelas = ['areas', 'projetos', 'clientes', 'tarefas']
for tabela in tabelas:
    ja = cur.execute("SELECT COUNT(*) FROM sync_mudancas WHERE usuario_id=? AND tabela=?", (uid, tabela)).fetchone()[0]
    if ja > 0:
        print(f"  {tabela}: ja enfileirada ({ja}), pulando")
        continue
    # PRAGMA table_info
    cols = [c[1] for c in cur.execute(f"PRAGMA table_info({tabela})").fetchall()]
    # tem coluna deleted_at?
    has_deleted = 'deleted_at' in cols
    where = f"SELECT * FROM {tabela} WHERE usuario_id = ? AND deleted_at IS NULL" if has_deleted else f"SELECT * FROM {tabela} WHERE usuario_id = ?"
    rows = cur.execute(where, (uid,)).fetchall()
    print(f"  {tabela}: {len(rows)} rows, cols={cols[:5]}, has_deleted={has_deleted}")
    # Enfileirar
    for row in rows:
        obj = dict(zip(cols, row))
        # em sqlite, nao temos auto-increment, mas sync_mudancas tem id manual
        # vou ver o max id
        pass

con.close()
