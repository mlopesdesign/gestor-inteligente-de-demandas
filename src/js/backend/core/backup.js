// src/js/backend/core/backup.js — backup manual e automatico
// v0.2.12: copia o banco SQLite pra dados/backups/ via Neutralino.os.execCommand
// (copy do Windows confiavel pra binario) e registra na tabela `backups`.
//
// Padrao: arquivo = gestor-YYYYMMDD-HHMMSS.db (ordenado por data, sem colisao)

import { UlidFactory } from '../ulid.js';
import { auditar } from './auditoria.js';

const AUTO_KEY = 'gestor-backup-auto';

function tsSlug(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear()
    + pad(d.getMonth() + 1)
    + pad(d.getDate())
    + '-' + pad(d.getHours())
    + pad(d.getMinutes())
    + pad(d.getSeconds());
}

function escCmd(s) {
  // Aspas duplas escapadas pra usar dentro de "..." em cmd.exe
  return '"' + String(s).replace(/"/g, '""') + '"';
}

// Executa um comando no shell e retorna {ok, stdout, stderr, exitCode}.
function exec(cmd, timeoutMs = 30000) {
  if (typeof window === 'undefined' || !window.Neutralino?.os?.execCommand) {
    return Promise.resolve({ ok: false, erro: 'Neutralino indisponivel (rode dentro do app)' });
  }
  return Promise.race([
    window.Neutralino.os.execCommand(cmd, { stdIn: '', stdOut: '', stdErr: '' })
      .then(r => ({ ok: r?.exitCode === 0, stdout: r?.stdOut || '', stderr: r?.stdErr || '', exitCode: r?.exitCode }))
      .catch(e => ({ ok: false, stdout: '', stderr: String(e?.message || e), exitCode: -1 })),
    new Promise(res => setTimeout(() => res({ ok: false, stdout: '', stderr: 'timeout ' + timeoutMs + 'ms', exitCode: -2 }), timeoutMs)),
  ]);
}

// Lista arquivos de um diretorio via cmd `dir /b`.
async function listarArquivos(dir) {
  if (typeof window === 'undefined' || !window.Neutralino?.filesystem?.readDirectory) return [];
  try {
    const arr = await window.Neutralino.filesystem.readDirectory(dir);
    return Array.isArray(arr) ? arr : [];
  } catch (_) { return []; }
}

async function tamanhoArquivo(caminho) {
  if (typeof window === 'undefined' || !window.Neutralino?.filesystem?.getStats) return 0;
  try {
    const s = await window.Neutralino.filesystem.getStats(caminho);
    return s?.size || 0;
  } catch (_) { return 0; }
}

async function arquivoExiste(caminho) {
  if (typeof window === 'undefined' || !window.Neutralino?.filesystem?.getStats) return false;
  try {
    await window.Neutralino.filesystem.getStats(caminho);
    return true;
  } catch (_) { return false; }
}

// Garante que o diretorio de backups existe (cria via cmd mkdir).
async function garantirBackupDir() {
  const dir = window.__env?.backupDir?.() || (window.GestorEnv && window.GestorEnv.backupDir && window.GestorEnv.backupDir());
  // Fallback seguro: constroi via documento do module
  const caminho = (dir) || (window.__appData ? window.__appData + '\\GestorInteligenteDeDemandas\\dados\\backups' : null);
  if (!caminho) throw new Error('backupDir nao resolvido');
  // Tenta criar recursivamente (mkdir nao e' recursivo no shell, mas createDirectory do Neutralino e')
  if (window.Neutralino?.filesystem?.createDirectory) {
    try { await window.Neutralino.filesystem.createDirectory(caminho); } catch (_) {}
  }
  return caminho;
}

function getBackupDir() {
  // Cache simples (sempre igual durante a sessao)
  if (getBackupDir._cache) return getBackupDir._cache;
  const d = (window.__appData || (typeof process !== 'undefined' && process.env?.APPDATA) || '')
    + '\\GestorInteligenteDeDemandas\\dados\\backups';
  getBackupDir._cache = d;
  return d;
}

// Cria um novo backup do banco atual. Retorna {ok, id, caminho, tamanho_bytes, criado_em}.
// origem: 'manual' | 'auto' | 'pre-update'
// observacao: string opcional pra contexto (ex: "antes de restaurar v0.2.10")
export async function criar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const origem = (payload && payload.origem) || 'manual';
  const observacao = (payload && payload.observacao) || null;
  try {
    const banco = (window.__appData || (typeof process !== 'undefined' && process.env?.APPDATA) || '')
      + '\\GestorInteligenteDeDemandas\\dados\\gestor.db';
    const dirBackups = getBackupDir();
    await garantirBackupDir();
    const id = UlidFactory.next();
    const slug = tsSlug();
    const caminho = dirBackups + '\\gestor-' + slug + '-' + id.slice(-6) + '.db';
    // 1) Copia o arquivo via `copy /Y` do Windows (confiavel pra binario)
    const r = await exec('copy /Y /B ' + escCmd(banco) + ' ' + escCmd(caminho));
    if (!r.ok) {
      return { ok: false, erro: { codigo: 'COPIA_FALHOU', mensagem: 'copy falhou: ' + (r.stderr || 'sem detalhes') } };
    }
    // 2) Calcula tamanho e insere na tabela `backups`
    const tamanho = await tamanhoArquivo(caminho);
    const criadoEm = new Date().toISOString();
    const ins = db.exec(
      `INSERT INTO backups(id, criado_em, caminho, tamanho_bytes, origem, observacao, status, versao)
       VALUES(?,?,?,?,?,?,'ok',1)`,
      [id, criadoEm, caminho, tamanho, origem, observacao]
    );
    if (!ins.ok) {
      return { ok: false, erro: { codigo: 'INSERCAO_FALHOU', mensagem: ins.erro?.mensagem || 'erro ao inserir' } };
    }
    auditar(db, { acao: 'BACKUP_CRIADO', recurso: 'backup', recurso_id: id, depois: { origem, observacao, tamanho_bytes: tamanho } }, sessao);
    return { ok: true, dados: { id, caminho, tamanho_bytes: tamanho, criado_em: criadoEm, origem, observacao } };
  } catch (e) {
    return { ok: false, erro: { codigo: 'INTERNO', mensagem: e.message } };
  }
}

// Lista todos os backups (mais recentes primeiro), cruzando tabela com tamanho real em disco.
export async function listar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const r = db.exec(`SELECT id, criado_em, caminho, tamanho_bytes, origem, observacao, status
                      FROM backups WHERE status != 'excluido'
                      ORDER BY criado_em DESC LIMIT 100`);
  if (!r.ok) return r;
  // Confere se cada arquivo ainda existe no disco (pode ter sido apagado manualmente)
  const out = [];
  for (const row of r.dados) {
    const existe = await arquivoExiste(row.caminho);
    out.push({ ...row, arquivo_existe: existe, tamanho_real: existe ? await tamanhoArquivo(row.caminho) : 0 });
  }
  return { ok: true, dados: out };
}

// Restaura um backup. CUIDADO: sobrescreve o banco atual.
// Fluxo: 1) cria backup pre-restore do banco atual (rollback). 2) fecha o db. 3) copia
// o backup selecionado sobre o banco. 4) recarrega o app.
export async function restaurar(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const id = payload?.id;
  if (!id) return { ok: false, erro: { codigo: 'PARAMETRO_OBRIGATORIO', mensagem: 'id do backup obrigatorio' } };
  const r = db.exec(`SELECT id, caminho, status FROM backups WHERE id = ?`, [id]);
  if (!r.ok || r.dados.length === 0) return { ok: false, erro: { codigo: 'NAO_ENCONTRADO' } };
  const backup = r.dados[0];
  if (backup.status !== 'ok') return { ok: false, erro: { codigo: 'BACKUP_INVALIDO', mensagem: 'backup com status ' + backup.status } };
  if (!(await arquivoExiste(backup.caminho))) {
    return { ok: false, erro: { codigo: 'ARQUIVO_FALTANDO', mensagem: 'arquivo do backup nao esta no disco: ' + backup.caminho } };
  }
  // 1) Backup de seguranca do banco atual (rollback caso a restauracao falhe)
  const pre = await criar(db, { origem: 'pre-update', observacao: 'antes de restaurar backup ' + id.slice(-6) }, sessao);
  if (!pre.ok) return { ok: false, erro: { codigo: 'PRE_BACKUP_FALHOU', mensagem: pre.erro?.mensagem || 'erro' } };
  // 2) Copia o backup selecionado sobre o banco atual
  const banco = (window.__appData || '')
    + '\\GestorInteligenteDeDemandas\\dados\\gestor.db';
  const r2 = await exec('copy /Y /B ' + escCmd(backup.caminho) + ' ' + escCmd(banco));
  if (!r2.ok) {
    return { ok: false, erro: { codigo: 'COPIA_FALHOU', mensagem: 'copy falhou: ' + (r2.stderr || 'sem detalhes') } };
  }
  // 3) Marca o backup como restaurado
  db.exec(`UPDATE backups SET status = 'restaurado' WHERE id = ?`, [id]);
  auditar(db, { acao: 'BACKUP_RESTAURADO', recurso: 'backup', recurso_id: id, depois: { pre_backup_id: pre.dados.id } }, sessao);
  return { ok: true, dados: { id, pre_backup_id: pre.dados.id, mensagem: 'Banco restaurado. O app sera reiniciado.' } };
}

// Exclui um backup (remove o arquivo + marca como excluido).
export async function excluir(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const id = payload?.id;
  if (!id) return { ok: false, erro: { codigo: 'PARAMETRO_OBRIGATORIO', mensagem: 'id do backup obrigatorio' } };
  const r = db.exec(`SELECT id, caminho FROM backups WHERE id = ?`, [id]);
  if (!r.ok || r.dados.length === 0) return { ok: false, erro: { codigo: 'NAO_ENCONTRADO' } };
  const caminho = r.dados[0].caminho;
  // Deleta o arquivo via cmd del (mais confiavel que filesystem.remove)
  await exec('del /F /Q ' + escCmd(caminho));
  db.exec(`UPDATE backups SET status = 'excluido' WHERE id = ?`, [id]);
  auditar(db, { acao: 'BACKUP_EXCLUIDO', recurso: 'backup', recurso_id: id }, sessao);
  return { ok: true, dados: { id, excluido: true } };
}

// Aplica politica de retencao: mantem apenas os N backups automaticos mais recentes.
// Tambem remove arquivos .db orfaos no diretorio que nao estao na tabela.
export async function aplicarRetencao(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const config = obterConfig();
  const max = config.retencao || 30;
  // Pega todos os backups automaticos ordenados por data desc
  const r = db.exec(
    `SELECT id, caminho, criado_em FROM backups
     WHERE origem = 'auto' AND status = 'ok'
     ORDER BY criado_em DESC`
  );
  if (!r.ok) return r;
  if (r.dados.length <= max) return { ok: true, dados: { mantidos: r.dados.length, removidos: 0 } };
  const paraExcluir = r.dados.slice(max);
  let removidos = 0;
  for (const b of paraExcluir) {
    await exec('del /F /Q ' + escCmd(b.caminho));
    db.exec(`UPDATE backups SET status = 'excluido' WHERE id = ?`, [b.id]);
    removidos++;
  }
  if (removidos > 0) auditar(db, { acao: 'BACKUP_RETENCAO', recurso: 'backup', depois: { removidos, max } }, sessao);
  return { ok: true, dados: { mantidos: r.dados.length - removidos, removidos } };
}

// ===== Config de backup automatico (persistido em localStorage) =====

function obterConfig() {
  try {
    const raw = localStorage.getItem(AUTO_KEY);
    if (raw) return Object.assign({ ativo: false, frequencia: 'diaria', retencao: 30, hora: 18, ultimoAuto: null }, JSON.parse(raw));
  } catch (_) {}
  return { ativo: false, frequencia: 'diaria', retencao: 30, hora: 18, ultimoAuto: null };
}

export function obterAuto(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  return { ok: true, dados: obterConfig() };
}

export function salvarAuto(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const atual = obterConfig();
  const novo = {
    ativo: payload?.ativo !== undefined ? !!payload.ativo : atual.ativo,
    frequencia: ['diaria', 'semanal', 'a cada abertura'].includes(payload?.frequencia) ? payload.frequencia : atual.frequencia,
    retencao: Math.max(1, Math.min(365, parseInt(payload?.retencao, 10) || atual.retencao || 30)),
    hora: Math.max(0, Math.min(23, parseInt(payload?.hora, 10) || atual.hora || 18)),
    ultimoAuto: atual.ultimoAuto,
  };
  try { localStorage.setItem(AUTO_KEY, JSON.stringify(novo)); } catch (_) {}
  return { ok: true, dados: novo };
}

// Hook chamado no boot do app. Se auto-backup estiver ativo, verifica se
// ja passou o intervalo desde o ultimo backup automatico, e cria um novo.
// Tambem aplica a politica de retencao.
export async function aplicarAuto(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: true, dados: { executado: false, motivo: 'nao_autenticado' } };
  const config = obterConfig();
  if (!config.ativo) return { ok: true, dados: { executado: false, motivo: 'desligado' } };
  const agora = new Date();
  if (config.ultimoAuto) {
    const diffMs = agora - new Date(config.ultimoAuto);
    const diffDias = diffMs / (1000 * 60 * 60 * 24);
    if (config.frequencia === 'diaria' && diffDias < 1) {
      return { ok: true, dados: { executado: false, motivo: 'ja_feito_hoje' } };
    }
    if (config.frequencia === 'semanal' && diffDias < 7) {
      return { ok: true, dados: { executado: false, motivo: 'ja_feito_essa_semana' } };
    }
    if (config.frequencia === 'a cada abertura') {
      // OK, faz sempre que abre
    }
  }
  const r = await criar(db, { origem: 'auto', observacao: 'backup automatico (' + config.frequencia + ')' }, sessao);
  if (r.ok) {
    config.ultimoAuto = agora.toISOString();
    try { localStorage.setItem(AUTO_KEY, JSON.stringify(config)); } catch (_) {}
    // Aplica retencao em paralelo
    aplicarRetencao(db, {}, sessao).catch(() => {});
  }
  return r.ok ? { ok: true, dados: { executado: true, id: r.dados.id } } : r;
}
