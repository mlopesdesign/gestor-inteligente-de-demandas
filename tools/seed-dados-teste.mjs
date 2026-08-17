// tools/seed-dados-teste.mjs
// Popula o banco do cliente com dados de teste realistas para Marcio ver.
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'GestorInteligenteDeDemandas', 'dados', 'gestor.db');
console.log('Banco:', dbPath);

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// 1. Listar usuarios existentes
const usuarios = db.prepare('SELECT id, email, nome FROM usuarios').all();
console.log('Usuarios:', usuarios);
if (usuarios.length === 0) {
    console.error('ERRO: nenhum usuario no banco. Crie uma conta primeiro pelo app.');
    process.exit(1);
}

const usuario = usuarios[0];
const usuarioId = usuario.id;
const donoId = usuarioId;
console.log('Usando usuario:', usuario.email, '(id:', usuarioId, ')');

const agora = () => new Date().toISOString();
const addDias = (d) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + d);
    return dt.toISOString();
};
const addDiasStr = (d) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + d);
    return dt.toISOString().slice(0, 10);
};
const ulid = () => {
    const t = Date.now().toString(36).toUpperCase().padStart(10, '0');
    const r = crypto.randomBytes(10).toString('hex').toUpperCase();
    return (t + r).slice(0, 26);
};

console.log('\n=== Limpando dados anteriores do usuario ===');
const tabelasLimpar = ['anexos', 'lembretes', 'subtarefas', 'tarefas', 'projetos', 'clientes', 'areas'];
for (const t of tabelasLimpar) {
    const r = db.prepare(`DELETE FROM ${t} WHERE usuario_id = ?`).run(usuarioId);
    console.log(`  ${t}: ${r.changes} removidos`);
}
// Dependencias nao tem usuario_id - limpa via tarefa_id
const r2 = db.prepare(`DELETE FROM dependencias WHERE tarefa_id IN (SELECT id FROM tarefas WHERE usuario_id = ?)`).run(usuarioId);
console.log(`  dependencias: ${r2.changes} removidos`);

console.log('\n=== Criando 3 areas ===');
const areas = [
    { nome: 'Design', cor: '#FFD633' },
    { nome: 'Desenvolvimento', cor: '#03a9f4' },
    { nome: 'Comercial', cor: '#2e7d32' },
];
const areaIds = {};
for (const [i, a] of areas.entries()) {
    const id = ulid();
    areaIds[a.nome] = id;
    db.prepare(`INSERT INTO areas (id, usuario_id, dono_id, nome, cor, ordem, criado_em, atualizado_em, versao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`).run(id, usuarioId, donoId, a.nome, a.cor, i, agora(), agora());
    console.log('  area:', a.nome, '->', id);
}

console.log('\n=== Criando 4 clientes ===');
const clientes = [
    { nome: 'Ana Paula', organizacao: 'Cenário Alagoas', contatos: { email: 'ana@cenarioalagoas.com.br', telefone: '(82) 99999-0001' } },
    { nome: 'Bruno Costa', organizacao: 'Recanto do Recreio', contatos: { email: 'bruno@recanto.com', telefone: '(82) 99999-0002' } },
    { nome: 'Carla Mendes', organizacao: 'Cacique de Ramos', contatos: { email: 'carla@cacique.com', telefone: '(82) 99999-0003' } },
    { nome: 'Diego Rocha', organizacao: 'IML Digital', contatos: { email: 'diego@iml.com', telefone: '(82) 99999-0004' } },
];
const clienteIds = {};
for (const c of clientes) {
    const id = ulid();
    clienteIds[c.nome] = id;
    db.prepare(`INSERT INTO clientes (id, usuario_id, dono_id, nome, organizacao, contatos_json, status, criado_em, atualizado_em, versao)
                VALUES (?, ?, ?, ?, ?, ?, 'ATIVO', ?, ?, 1)`)
      .run(id, usuarioId, donoId, c.nome, c.organizacao, JSON.stringify(c.contatos), agora(), agora());
    console.log('  cliente:', c.nome, '->', id);
}

console.log('\n=== Criando 4 projetos ===');
const projetos = [
    { titulo: 'Site Cenário Alagoas - Migração WordPress 6.6', cliente: 'Ana Paula', area: 'Desenvolvimento', status: 'EM_ANDAMENTO', prioridade: 'ALTA', inicio: -14, fim: 30 },
    { titulo: 'Identidade visual Recanto do Recreio', cliente: 'Bruno Costa', area: 'Design', status: 'EM_ANDAMENTO', prioridade: 'NORMAL', inicio: -7, fim: 21 },
    { titulo: 'Landing page Cacique de Ramos', cliente: 'Carla Mendes', area: 'Design', status: 'PLANEJADO', prioridade: 'ALTA', inicio: 0, fim: 14 },
    { titulo: 'App IML Mobile (React Native)', cliente: 'Diego Rocha', area: 'Desenvolvimento', status: 'PLANEJADO', prioridade: 'URGENTE', inicio: 0, fim: 60 },
];
const projetoIds = {};
for (const p of projetos) {
    const id = ulid();
    projetoIds[p.titulo] = id;
    db.prepare(`INSERT INTO projetos (id, usuario_id, dono_id, titulo, cliente_id, area_id, status, prioridade, inicio_em, fim_em, criado_em, atualizado_em, versao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
      .run(id, usuarioId, donoId, p.titulo, clienteIds[p.cliente], areaIds[p.area], p.status, p.prioridade,
           addDiasStr(p.inicio), addDiasStr(p.fim), agora(), agora());
    console.log('  projeto:', p.titulo, '->', id);
}

console.log('\n=== Criando 12 tarefas (variados estados) ===');
const tarefas = [
    // HOJE (3)
    { titulo: 'Revisar layout da home Cenário Alagoas', projeto: 'Site Cenário Alagoas - Migração WordPress 6.6', cliente: 'Ana Paula', area: 'Design', status: 'EM_ANDAMENTO', prioridade: 'ALTA', venc: 0, dur: 90, responsavel: 'Marcio' },
    { titulo: 'Subir versão nova do tema para staging', projeto: 'Site Cenário Alagoas - Migração WordPress 6.6', cliente: 'Ana Paula', area: 'Desenvolvimento', status: 'PLANEJADA', prioridade: 'URGENTE', venc: 0, dur: 30, responsavel: 'Marcio' },
    { titulo: 'Cobrar aprovação do logo Recanto', projeto: 'Identidade visual Recanto do Recreio', cliente: 'Bruno Costa', area: 'Comercial', status: 'AGUARDANDO_TERCEIRO', prioridade: 'ALTA', venc: 0, dur: 15, responsavel: 'Marcio' },

    // AMANHA (2)
    { titulo: 'Refinar paleta amarela do site', projeto: 'Site Cenário Alagoas - Migração WordPress 6.6', cliente: 'Ana Paula', area: 'Design', status: 'PLANEJADA', prioridade: 'NORMAL', venc: 1, dur: 60, responsavel: 'Marcio' },
    { titulo: 'Mockup da home do Recanto', projeto: 'Identidade visual Recanto do Recreio', cliente: 'Bruno Costa', area: 'Design', status: 'EM_ANDAMENTO', prioridade: 'NORMAL', venc: 1, dur: 120, responsavel: 'Marcio' },

    // ESSA SEMANA (2)
    { titulo: 'Definir tipografia da landing Cacique', projeto: 'Landing page Cacique de Ramos', cliente: 'Carla Mendes', area: 'Design', status: 'PLANEJADA', prioridade: 'NORMAL', venc: 4, dur: 90, responsavel: 'Marcio' },
    { titulo: 'Configurar CI/CD do app IML', projeto: 'App IML Mobile (React Native)', cliente: 'Diego Rocha', area: 'Desenvolvimento', status: 'PLANEJADA', prioridade: 'ALTA', venc: 5, dur: 180, responsavel: 'Marcio' },

    // ATRASADAS (2)
    { titulo: 'Atualizar plugins do site Cenário', projeto: 'Site Cenário Alagoas - Migração WordPress 6.6', cliente: 'Ana Paula', area: 'Desenvolvimento', status: 'PLANEJADA', prioridade: 'URGENTE', venc: -3, dur: 60, responsavel: 'Marcio' },
    { titulo: 'Enviar proposta comercial IML', projeto: 'App IML Mobile (React Native)', cliente: 'Diego Rocha', area: 'Comercial', status: 'AGUARDANDO_TERCEIRO', prioridade: 'CRITICA', venc: -5, dur: 30, responsavel: 'Marcio' },

    // SEM DATA / CAIXA (2)
    { titulo: 'Estudar opções de app de notas rápidas', projeto: null, cliente: null, area: null, status: 'CAIXA_ENTRADA', prioridade: 'BAIXA', venc: null, dur: 30, responsavel: 'Marcio' },
    { titulo: 'Backup do banco de clientes', projeto: null, cliente: null, area: 'Desenvolvimento', status: 'CAIXA_ENTRADA', prioridade: 'NORMAL', venc: null, dur: 20, responsavel: 'Marcio' },

    // CONCLUIDA (1)
    { titulo: 'Briefing inicial com Ana Paula', projeto: 'Site Cenário Alagoas - Migração WordPress 6.6', cliente: 'Ana Paula', area: 'Comercial', status: 'CONCLUIDA', prioridade: 'NORMAL', venc: -10, dur: 45, responsavel: 'Marcio', concluida: -10 },
];

const tarefaIds = {};
for (const t of tarefas) {
    const id = ulid();
    tarefaIds[t.titulo] = id;
    const projetoId = t.projeto ? projetoIds[t.projeto] : null;
    const clienteId = t.cliente ? clienteIds[t.cliente] : null;
    const areaId = t.area ? areaIds[t.area] : null;
    const venc = t.venc !== null ? addDiasStr(t.venc) : null;
    const concluida_em = t.concluida ? addDiasStr(t.concluida) : null;
    db.prepare(`INSERT INTO tarefas (id, usuario_id, dono_id, titulo, projeto_id, cliente_id, area_id, status, prioridade, nivel_cobranca, vencimento_em, duracao_estimada_min, duracao_realizada_min, responsavel, etiquetas_json, origem, concluida_em, criado_em, atualizado_em, versao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PERSISTENTE', ?, ?, ?, ?, '[]', 'MANUAL', ?, ?, ?, 1)`)
      .run(id, usuarioId, donoId, t.titulo, projetoId, clienteId, areaId, t.status, t.prioridade,
           venc, t.dur, t.status === 'CONCLUIDA' ? t.dur : 0, t.responsavel, concluida_em, agora(), agora());
    console.log('  tarefa:', t.titulo, '[' + t.status + '] venc:', venc || '-');
}

console.log('\n=== Criando 3 lembretes (cobranças pendentes) ===');
const lembretesTarefas = [
    { titulo: 'Cobrar aprovação do logo Recanto', canal: 'WINDOWS_LOCAL', em: 0 },
    { titulo: 'Atualizar plugins do site Cenário', canal: 'WINDOWS_LOCAL', em: -1 },
    { titulo: 'Enviar proposta comercial IML', canal: 'WINDOWS_LOCAL', em: -2 },
];
for (const l of lembretesTarefas) {
    const tid = tarefaIds[l.titulo];
    if (!tid) continue;
    const id = ulid();
    const momento = addDias(l.em);
    db.prepare(`INSERT INTO lembretes (id, tarefa_id, usuario_id, dono_id, momento, canal, estado, tentativas, criado_em, versao)
                VALUES (?, ?, ?, ?, ?, ?, 'PENDENTE', 0, ?, 1)`)
      .run(id, tid, usuarioId, donoId, momento, l.canal, agora());
    console.log('  lembrete:', l.titulo, '->', momento);
}

console.log('\n=== Resumo final ===');
const counts = {};
for (const t of tabelasLimpar) {
    counts[t] = db.prepare(`SELECT COUNT(*) as c FROM ${t} WHERE usuario_id = ?`).get(usuarioId).c;
}
console.log(counts);

db.close();
console.log('\nOK! Banco populado.');
