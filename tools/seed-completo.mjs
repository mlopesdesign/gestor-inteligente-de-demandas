// tools/seed-completo.mjs - cria banco com schema + demo + dados de teste
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const SALT = 'gestor-ml-lopes-2026';
function hashSenha(senha) {
    return crypto.createHash('sha256').update(SALT + senha).digest('hex');
}
function ulid() {
    const t = Date.now().toString(36).toUpperCase().padStart(10, '0');
    const r = crypto.randomBytes(10).toString('hex').toUpperCase();
    return (t + r).slice(0, 26);
}
const agora = () => new Date().toISOString();
const addDiasStr = (d) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + d);
    return dt.toISOString().slice(0, 10);
};

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'GestorInteligenteDeDemandas', 'dados', 'gestor.db');
const schemaPath = path.join('E:', 'Projetos', 'LOPES FOCUS', 'schema.sql');

// 1. Deletar banco existente
if (fs.existsSync(dbPath)) { fs.unlinkSync(dbPath); console.log('Banco removido:', dbPath); }

// 2. Criar banco novo
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// 3. Aplicar schema
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);
console.log('Schema aplicado');

// 4. Criar usuario demo
const usuarioId = ulid();
const senhaHash = hashSenha('');
db.prepare(`INSERT INTO usuarios (id, email, senha_hash, nome, fuso, horario_trab_inicio, horario_trab_fim, dias_trabalho_json, tom_cobranca, ia_habilitada, criado_em, atualizado_em, versao, dono_id)
            VALUES (?, 'demo@gestor.local', ?, 'Marcio Lopes', 'America/Sao_Paulo', '08:00', '18:00', '[1,2,3,4,5]', 'PROFISSIONAL', 1, ?, ?, 1, ?)`)
  .run(usuarioId, senhaHash, agora(), agora(), usuarioId);
db.prepare(`INSERT INTO cobranca_config (usuario_id, silenciar_fora_horario, politicas_json, versao) VALUES (?, 1, '{}', 1)`).run(usuarioId);
console.log('Usuario demo criado:', usuarioId);

// 5. Areas
const areaIds = {};
const areas = [
    { nome: 'Design', cor: '#FFD633' },
    { nome: 'Desenvolvimento', cor: '#03a9f4' },
    { nome: 'Comercial', cor: '#2e7d32' },
];
for (const [i, a] of areas.entries()) {
    const id = ulid();
    areaIds[a.nome] = id;
    db.prepare(`INSERT INTO areas (id, usuario_id, dono_id, nome, cor, ordem, criado_em, atualizado_em, versao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`).run(id, usuarioId, usuarioId, a.nome, a.cor, i, agora(), agora());
}

// 6. Clientes
const clienteIds = {};
const clientes = [
    { nome: 'Ana Paula', organizacao: 'Cenário Alagoas' },
    { nome: 'Bruno Costa', organizacao: 'Recanto do Recreio' },
    { nome: 'Carla Mendes', organizacao: 'Cacique de Ramos' },
    { nome: 'Diego Rocha', organizacao: 'IML Digital' },
];
for (const c of clientes) {
    const id = ulid();
    clienteIds[c.nome] = id;
    db.prepare(`INSERT INTO clientes (id, usuario_id, dono_id, nome, organizacao, contatos_json, status, criado_em, atualizado_em, versao)
                VALUES (?, ?, ?, ?, ?, '{}', 'ATIVO', ?, ?, 1)`).run(id, usuarioId, usuarioId, c.nome, c.organizacao, agora(), agora());
}

// 7. Projetos
const projetoIds = {};
const projetos = [
    { titulo: 'Site Cenário Alagoas - Migração WordPress 6.6', cliente: 'Ana Paula', area: 'Desenvolvimento', status: 'EM_ANDAMENTO', prioridade: 'ALTA', inicio: -14, fim: 30 },
    { titulo: 'Identidade visual Recanto do Recreio', cliente: 'Bruno Costa', area: 'Design', status: 'EM_ANDAMENTO', prioridade: 'NORMAL', inicio: -7, fim: 21 },
    { titulo: 'Landing page Cacique de Ramos', cliente: 'Carla Mendes', area: 'Design', status: 'PLANEJADO', prioridade: 'ALTA', inicio: 0, fim: 14 },
    { titulo: 'App IML Mobile (React Native)', cliente: 'Diego Rocha', area: 'Desenvolvimento', status: 'PLANEJADO', prioridade: 'URGENTE', inicio: 0, fim: 60 },
];
for (const p of projetos) {
    const id = ulid();
    projetoIds[p.titulo] = id;
    db.prepare(`INSERT INTO projetos (id, usuario_id, dono_id, titulo, cliente_id, area_id, status, prioridade, inicio_em, fim_em, criado_em, atualizado_em, versao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).run(id, usuarioId, usuarioId, p.titulo, clienteIds[p.cliente], areaIds[p.area], p.status, p.prioridade, addDiasStr(p.inicio), addDiasStr(p.fim), agora(), agora());
}

// 8. Tarefas
const tarefas = [
    { titulo: 'Revisar layout da home Cenário Alagoas', projeto: 'Site Cenário Alagoas - Migração WordPress 6.6', cliente: 'Ana Paula', area: 'Design', status: 'EM_ANDAMENTO', prioridade: 'ALTA', venc: 0, dur: 90 },
    { titulo: 'Subir versão nova do tema para staging', projeto: 'Site Cenário Alagoas - Migração WordPress 6.6', cliente: 'Ana Paula', area: 'Desenvolvimento', status: 'PLANEJADA', prioridade: 'URGENTE', venc: 0, dur: 30 },
    { titulo: 'Cobrar aprovação do logo Recanto', projeto: 'Identidade visual Recanto do Recreio', cliente: 'Bruno Costa', area: 'Comercial', status: 'AGUARDANDO_TERCEIRO', prioridade: 'ALTA', venc: 0, dur: 15 },
    { titulo: 'Refinar paleta amarela do site', projeto: 'Site Cenário Alagoas - Migração WordPress 6.6', cliente: 'Ana Paula', area: 'Design', status: 'PLANEJADA', prioridade: 'NORMAL', venc: 1, dur: 60 },
    { titulo: 'Mockup da home do Recanto', projeto: 'Identidade visual Recanto do Recreio', cliente: 'Bruno Costa', area: 'Design', status: 'EM_ANDAMENTO', prioridade: 'NORMAL', venc: 1, dur: 120 },
    { titulo: 'Definir tipografia da landing Cacique', projeto: 'Landing page Cacique de Ramos', cliente: 'Carla Mendes', area: 'Design', status: 'PLANEJADA', prioridade: 'NORMAL', venc: 4, dur: 90 },
    { titulo: 'Configurar CI/CD do app IML', projeto: 'App IML Mobile (React Native)', cliente: 'Diego Rocha', area: 'Desenvolvimento', status: 'PLANEJADA', prioridade: 'ALTA', venc: 5, dur: 180 },
    { titulo: 'Atualizar plugins do site Cenário', projeto: 'Site Cenário Alagoas - Migração WordPress 6.6', cliente: 'Ana Paula', area: 'Desenvolvimento', status: 'PLANEJADA', prioridade: 'URGENTE', venc: -3, dur: 60 },
    { titulo: 'Enviar proposta comercial IML', projeto: 'App IML Mobile (React Native)', cliente: 'Diego Rocha', area: 'Comercial', status: 'AGUARDANDO_TERCEIRO', prioridade: 'CRITICA', venc: -5, dur: 30 },
    { titulo: 'Estudar opções de app de notas rápidas', projeto: null, cliente: null, area: null, status: 'CAIXA_ENTRADA', prioridade: 'BAIXA', venc: null, dur: 30 },
    { titulo: 'Backup do banco de clientes', projeto: null, cliente: null, area: 'Desenvolvimento', status: 'CAIXA_ENTRADA', prioridade: 'NORMAL', venc: null, dur: 20 },
    { titulo: 'Briefing inicial com Ana Paula', projeto: 'Site Cenário Alagoas - Migração WordPress 6.6', cliente: 'Ana Paula', area: 'Comercial', status: 'CONCLUIDA', prioridade: 'NORMAL', venc: -10, dur: 45, concluida: -10 },
];
for (const t of tarefas) {
    const id = ulid();
    const projetoId = t.projeto ? projetoIds[t.projeto] : null;
    const clienteId = t.cliente ? clienteIds[t.cliente] : null;
    const areaId = t.area ? areaIds[t.area] : null;
    const venc = t.venc !== null ? addDiasStr(t.venc) : null;
    const concluida_em = t.concluida ? addDiasStr(t.concluida) : null;
    db.prepare(`INSERT INTO tarefas (id, usuario_id, dono_id, titulo, projeto_id, cliente_id, area_id, status, prioridade, nivel_cobranca, vencimento_em, duracao_estimada_min, duracao_realizada_min, responsavel, etiquetas_json, origem, concluida_em, criado_em, atualizado_em, versao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PERSISTENTE', ?, ?, ?, 'Marcio', '[]', 'MANUAL', ?, ?, ?, 1)`)
      .run(id, usuarioId, usuarioId, t.titulo, projetoId, clienteId, areaId, t.status, t.prioridade, venc, t.dur, t.status === 'CONCLUIDA' ? t.dur : 0, concluida_em, agora(), agora());
}

// 9. Lembretes
const lembreteTarefas = ['Cobrar aprovação do logo Recanto', 'Atualizar plugins do site Cenário', 'Enviar proposta comercial IML'];
const lembreteRows = db.prepare(`SELECT id, titulo FROM tarefas WHERE usuario_id = ? AND titulo IN (?, ?, ?)`).all(usuarioId, ...lembreteTarefas);
for (const l of lembreteRows) {
    const id = ulid();
    const dt = new Date(); dt.setDate(dt.getDate() - 1);
    db.prepare(`INSERT INTO lembretes (id, tarefa_id, usuario_id, dono_id, momento, canal, estado, tentativas, criado_em, versao)
                VALUES (?, ?, ?, ?, ?, 'WINDOWS_LOCAL', 'PENDENTE', 0, ?, 1)`).run(id, l.id, usuarioId, usuarioId, dt.toISOString(), agora());
}

db.close();
console.log('Banco criado com sucesso em:', dbPath);
console.log('Tamanho:', fs.statSync(dbPath).size, 'bytes');
