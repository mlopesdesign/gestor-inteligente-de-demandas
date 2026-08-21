import sqlite3, os
db = r'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas\dados\gestor.db'
con = sqlite3.connect(db)
for t in ['sessoes', 'sync_mudancas', 'sync_cursores', 'usuarios', 'areas', 'tarefas', 'clientes', 'projetos', 'tombstones', 'dispositivos', 'auditoria', 'sync_conflitos']:
    try:
        n = con.execute(f'DELETE FROM {t}').rowcount
        print(f'  {t}: {n} rows deleted')
    except Exception as e:
        print(f'  {t}: ERRO {e}')
con.commit()
con.close()
# tambem limpa o sync_state.json (sobrescreve com {})
sp = r'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas\dados\sync_state.json'
if os.path.exists(sp):
    with open(sp, 'w', encoding='utf-8') as f:
        f.write('{}')
    print('sync_state.json limpo')
print('OK')
