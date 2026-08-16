// diag-banco.mjs - diagnostica o banco do Marcio
import Database from 'better-sqlite3';
const dbPath = process.env.APPDATA + '\\GestorInteligenteDeDemandas\\gestor_local.db';
const db = new Database(dbPath, { readonly: true });
console.log('Schema completo:');
const tabs = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name").all();
tabs.forEach(t => console.log('--', t.name, '--\n' + t.sql + '\n'));
console.log('\nQuantidade de tarefas:');
console.log(db.prepare('SELECT count(*) as c FROM tarefas').get());
console.log('Sample tarefas:');
console.log(db.prepare('SELECT * FROM tarefas LIMIT 3').all());
