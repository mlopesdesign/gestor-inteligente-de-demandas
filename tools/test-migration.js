// Simula o que o app faria: abre o db, importa enfileirarDadosLegados, roda
// e ve se enfileirou as 3 areas.
import { db, enfileirarDadosLegados } from '../src/js/backend/db.js';

const uid = '01DEMOV3UWGO9DZL';
await db.abrir();
console.log('DB aberto');
const r = await enfileirarDadosLegados(uid);
console.log('Resultado:', JSON.stringify(r));
const after = dbInstance_exec('SELECT id, tabela, operacao, registro_id, aplicada FROM sync_mudancas ORDER BY id');
console.log('SYNC_MUDANCAS depois:', after);
db.fechar();
