import sqlite3, os
from datetime import datetime, timedelta

banco = os.path.join(os.environ['APPDATA'], 'GestorInteligenteDeDemandas', 'dados', 'gestor.db')
print('banco:', banco, 'existe:', os.path.isfile(banco))

con = sqlite3.connect(banco)
cur = con.cursor()

# Garante tabela backups (idempotente)
cur.execute('''CREATE TABLE IF NOT EXISTS backups (
  id              TEXT PRIMARY KEY,
  criado_em       TEXT NOT NULL,
  caminho         TEXT NOT NULL,
  tamanho_bytes   INTEGER NOT NULL,
  origem          TEXT NOT NULL,
  observacao      TEXT,
  sha256          TEXT,
  status          TEXT NOT NULL DEFAULT 'ok'
)''')
cur.execute('CREATE INDEX IF NOT EXISTS idx_backups_criado_em ON backups(criado_em DESC)')

# Limpa backups anteriores
cur.execute('DELETE FROM backups WHERE id LIKE ?', ('DEMO%',))

hoje = datetime.now()
for i, (origem, obs, dias_atras) in enumerate([
    ('manual', 'manual via tela de Configuracoes', 0),
    ('auto', 'backup automatico (diaria)', 1),
    ('auto', 'backup automatico (diaria)', 3),
]):
    dt = hoje - timedelta(days=dias_atras, hours=i)
    iso = dt.isoformat() + 'Z'
    slug = dt.strftime('%Y%m%d') + '-' + dt.strftime('%H%M%S')
    caminho = 'C:\\Users\\mlope\\AppData\\Roaming\\GestorInteligenteDeDemandas\\dados\\backups\\gestor-' + slug + '-demo' + str(i) + '.db'
    id_demo = 'DEMO' + dt.strftime('%Y%m%d%H%M%S') + str(i).zfill(10)
    cur.execute('DELETE FROM backups WHERE id = ?', (id_demo,))
    cur.execute(
        'INSERT INTO backups(id, criado_em, caminho, tamanho_bytes, origem, observacao, status) VALUES(?,?,?,?,?,?,?)',
        (id_demo, iso, caminho, 286720 + i*100, origem, obs, 'ok')
    )
    print('inserido:', origem, iso)

con.commit()
cur.execute('SELECT COUNT(*) FROM backups')
print('total backups:', cur.fetchone()[0])
con.close()
print('OK')
