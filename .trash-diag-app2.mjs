// diag-app2.mjs - cria banco via better-sqlite3 no mesmo path do app
import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dataDir = process.env.APPDATA + '\\GestorInteligenteDeDemandas\\dados';
mkdirSync(dataDir, { recursive: true });
const dbPath = join(dataDir, 'gestor.db');
console.log('Criando banco em:', dbPath);

const schema = readFileSync('src/schema.sql', 'utf-8');
const db = new Database(dbPath);
db.exec(schema);

console.log('Tabelas criadas:');
const tabs = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tabs.forEach(t => console.log('  ' + t.name));

db.close();
console.log('Banco criado com sucesso');
