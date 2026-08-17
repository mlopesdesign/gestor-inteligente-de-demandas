// tools/seed-usuario.mjs - cria usuario demo@gestor.local direto no banco
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';

const SALT = 'gestor-ml-lopes-2026';
function hashSenha(senha) {
    return crypto.createHash('sha256').update(SALT + senha).digest('hex');
}

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'GestorInteligenteDeDemandas', 'dados', 'gestor.db');
const db = new Database(dbPath);

// Gerar ULID
function ulid() {
    const t = Date.now().toString(36).toUpperCase().padStart(10, '0');
    const r = crypto.randomBytes(10).toString('hex').toUpperCase();
    return (t + r).slice(0, 26);
}

const existing = db.prepare("SELECT id, email FROM usuarios WHERE email = ?").get('demo@gestor.local');
if (existing) {
    console.log('demo@gestor.local ja existe:', existing.id);
    process.exit(0);
}

const id = ulid();
const agora = new Date().toISOString();
const senhaHash = hashSenha(''); // senha vazia (padrao MVP)

db.prepare(`INSERT INTO usuarios (id, email, senha_hash, nome, fuso, horario_trab_inicio, horario_trab_fim, dias_trabalho_json, tom_cobranca, ia_habilitada, criado_em, atualizado_em, versao, dono_id)
            VALUES (?, 'demo@gestor.local', ?, 'Marcio Lopes', 'America/Sao_Paulo', '08:00', '18:00', '[1,2,3,4,5]', 'PROFISSIONAL', 1, ?, ?, 1, ?)`)
  .run(id, senhaHash, agora, agora, id);

console.log('Usuario demo criado:', id, '(senha: vazia)');

// Cria config de cobranca
db.prepare(`INSERT INTO cobranca_config (usuario_id, silenciar_fora_horario, politicas_json, versao) VALUES (?, 1, '{}', 1)`).run(id);

console.log('OK');

db.close();
