// src/js/backend/core/sync.js — sincronizacao bidirecional com plugin WP
// v0.2.24: implementacao minima viavel
//
// Protocolo:
//   1. Login: POST {wpUrl}/auth/login  (email, senha) -> { token, expiraEm, usuario }
//   2. Pull:  GET  {wpUrl}/sync/pull?dispositivo_id=X&since=<ultimoId>
//   3. Push:  POST {wpUrl}/sync/push  { dispositivo_id, mutacoes: [{tabela,operacao,registroId,payload}] }
//
// Storage local: arquivo JSON no dataDir (state.json).
// Cursor de "ultimo id sincronizado" e fila de mudancas: tabelas SQLite sync_mudancas / sync_cursores.

import { env } from '../ambiente.js';
import { UlidFactory } from '../ulid.js';

const STATE_FILENAME = 'sync_state.json';

// Tabelas sincronizaveis (espelho do plugin WP).
// Cada entrada: { tabela, colunaId, payloadFromRow(row), rowFromPayload(payload) }
const TABELAS_SYNC = {
  tarefas: {
    colunaId: 'id',
    colunasSync: ['id','titulo','descricao','status','prioridade','nivel_cobranca',
      'area_id','projeto_id','cliente_id','inicio_em','vencimento_em',
      'duracao_estimada_min','duracao_realizada_min','etiquetas_json',
      'responsavel','origem','concluida_em','entregue_em','criada_em','atualizada_em','versao'],
  },
  clientes: {
    colunaId: 'id',
    colunasSync: ['id','nome','documento','email','telefone','endereco_json',
      'observacoes','arquivado','criado_em','atualizado_em','versao'],
  },
  projetos: {
    colunaId: 'id',
    colunasSync: ['id','nome','descricao','cliente_id','area_id','cor',
      'status','inicio_em','fim_previsto_em','concluido_em','arquivado',
      'criado_em','atualizado_em','versao'],
  },
  areas: {
    colunaId: 'id',
    colunasSync: ['id','nome','cor','descricao','criada_em','atualizada_em','versao'],
  },
};

// ============================================================================
// STATE PERSISTENCE (sync_state.json no dataDir)
// ============================================================================

function statePath() {
  return `${env.dataDir()}\\${STATE_FILENAME}`;
}

async function readState() {
  if (NO_APP) return emptyState();
  try {
    const Neutralino = window.Neutralino;
    if (!Neutralino?.filesystem?.readFile) return emptyState();
    const data = await Neutralino.filesystem.readFile(statePath());
    const txt = new TextDecoder().decode(data);
    return { ...emptyState(), ...JSON.parse(txt) };
  } catch (_) {
    return emptyState();
  }
}

async function writeState(s) {
  if (NO_APP) return;
  try {
    const Neutralino = window.Neutralino;
    if (!Neutralino?.filesystem?.writeFile) return;
    const data = new TextEncoder().encode(JSON.stringify(s, null, 2));
    await Neutralino.filesystem.writeFile(statePath(), data);
  } catch (e) {
    console.error('[sync] writeState falhou:', e);
  }
}

function emptyState() {
  return {
    wp_url: 'https://tools.mlopesdesign.com.br/wp-json/gestor/v1',
    wp_token: null,
    wp_email: null,
    wp_usuario_id: null,
    wp_dispositivo_id: null,
    wp_expira_em: null,
    ultimo_sync: null,
    ultimo_pull_id: 0,
  };
}

function newDispositivoId() {
  // ULID-like: timestamp + random
  return 'desktop-' + UlidFactory.next().toLowerCase();
}

function detectNoApp() {
  try { return typeof window === 'undefined' || !window.NL_PORT; }
  catch (_) { return true; }
}
const NO_APP = detectNoApp();

// ============================================================================
// HTTP HELPERS
// ============================================================================

async function wpFetch(method, path, body, token) {
  const state = await readState();
  const base = state.wp_url || 'https://tools.mlopesdesign.com.br/wp-json/gestor/v1';
  const url = base + path;
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'GestorDesktop/0.2.34',
  };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { ok: r.ok, status: r.status, json, text };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/** status: retorna config + metricas (sem chamar WP). */
export async function status(db, p, s) {
  const st = await readState();
  const pendentes = countMudancas(db, s);
  const conflitos = countConflitos(db, s);
  return {
    ok: true,
    dados: {
      conectado: !!st.wp_token,
      wp_url: st.wp_url,
      email: st.wp_email || null,
      dispositivo_id: st.wp_dispositivo_id,
      ultimo_sync: st.ultimo_sync,
      mudancas_pendentes: pendentes,
      conflitos_pendentes: conflitos,
    },
  };
}

/** login: autentica no WP, guarda token + dispositivo_id. */
export async function login(db, p, s) {
  if (!p?.email || !p?.senha) return { ok: false, erro: { codigo: 'CREDENCIAIS_AUSENTES', mensagem: 'E-mail e senha obrigatorios.' } };
  if (NO_APP) return { ok: false, erro: { codigo: 'OFFLINE', mensagem: 'Recurso disponivel apenas no app.' } };

  const r = await wpFetch('POST', '/auth/login', {
    email: p.email,
    senha: p.senha,
    dispositivo_id: '', // backend WP gera se vazio
    sistema: 'DESKTOP',
    app_versao: '0.2.34',
  }, null);
  if (!r.ok || !r.json?.success) {
    return { ok: false, erro: { codigo: 'LOGIN_FALHOU', mensagem: r.json?.data?.message || r.json?.message || ('HTTP ' + r.status) } };
  }
  const data = r.json.data;
  const st = await readState();
  st.wp_token = data.token;
  st.wp_email = p.email;
  st.wp_usuario_id = data.usuario?.id || null;
  st.wp_expira_em = data.expira_em || null;
  // Garante dispositivo_id estavel
  if (!st.wp_dispositivo_id) st.wp_dispositivo_id = newDispositivoId();
  // Garante cursor inicializado
  if (typeof st.ultimo_pull_id !== 'number') st.ultimo_pull_id = 0;
  await writeState(st);
  return { ok: true, dados: { email: p.email, expira_em: st.wp_expira_em, dispositivo_id: st.wp_dispositivo_id } };
}

/** logout: limpa token mas mantem wp_url e email pre-preenchido. */
export async function logout(db, p, s) {
  const st = await readState();
  st.wp_token = null;
  st.wp_usuario_id = null;
  st.wp_expira_em = null;
  await writeState(st);
  return { ok: true, dados: {} };
}

/** executar: push (envia mudancas locais) + pull (baixa deltas). Retorna resumo. */
export async function executar(db, p, s) {
  const st = await readState();
  if (!st.wp_token) return { ok: false, erro: { codigo: 'NAO_CONECTADO', mensagem: 'Faca login no WP primeiro (aba Sincronizacao).' } };
  if (NO_APP) return { ok: false, erro: { codigo: 'OFFLINE', mensagem: 'Recurso disponivel apenas no app.' } };

  const resumo = { aplicadas: 0, recebidas: 0, conflitos: 0, erros: [] };
  try {
    // 1) PUSH
    const pushRes = await enviarPush(db, st, s);
    if (pushRes.ok) {
      resumo.aplicadas = pushRes.dados?.aplicadas || 0;
      resumo.conflitos = pushRes.dados?.conflitos || 0;
    } else {
      resumo.erros.push('push: ' + (pushRes.erro?.mensagem || 'falhou'));
    }
    // 2) PULL
    const pullRes = await receberPull(db, st, s);
    if (pullRes.ok) {
      resumo.recebidas = pullRes.dados?.recebidas || 0;
    } else {
      resumo.erros.push('pull: ' + (pullRes.erro?.mensagem || 'falhou'));
    }
    st.ultimo_sync = new Date().toISOString();
    await writeState(st);
  } catch (e) {
    return { ok: false, erro: { codigo: 'SYNC_ERRO', mensagem: e.message } };
  }
  return { ok: true, dados: resumo };
}

/** push: apenas envia (sem pull). Para testes. */
export async function push(db, p, s) {
  const st = await readState();
  if (!st.wp_token) return { ok: false, erro: { codigo: 'NAO_CONECTADO' } };
  return await enviarPush(db, st, s);
}

/** pull: apenas recebe (sem push). Para testes. */
export async function pull(db, p, s) {
  const st = await readState();
  if (!st.wp_token) return { ok: false, erro: { codigo: 'NAO_CONECTADO' } };
  return await receberPull(db, st, s);
}

export async function listarConflitos(db, p, s) {
  if (!s.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const r = db.exec(
    `SELECT id, tabela, registro_id, versao_servidor, versao_cliente_a, dispositivo_a_id,
            estado, criado_em FROM sync_conflitos WHERE usuario_id = ? AND estado = 'PENDENTE' ORDER BY criado_em DESC LIMIT 200`,
    [s.usuario_id]
  );
  if (!r.ok) return r;
  return { ok: true, dados: r.dados };
}

export async function resolver(db, p, s) {
  if (!s.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  if (!p?.id || !p?.escolha) return { ok: false, erro: { codigo: 'PARAM_OBRIGATORIO' } };
  // Implementacao minima: marca como resolvido. Proxima sprint: aplicar a escolha.
  const r = db.exec(
    `UPDATE sync_conflitos SET estado = ?, escolhido_por = ?, escolhido_em = ? WHERE id = ? AND usuario_id = ?`,
    ['RESOLVIDO_' + p.escolha.toUpperCase(), s.usuario_id, new Date().toISOString(), p.id, s.usuario_id]
  );
  return r.ok ? { ok: true, dados: { id: p.id, estado: 'RESOLVIDO_' + p.escolha.toUpperCase() } } : r;
}

// ============================================================================
// INTERNALS — push e pull
// ============================================================================

async function enviarPush(db, st, s) {
  // Coleta mudancas locais pendentes da sync_mudancas
  const r = db.exec(
    `SELECT id, tabela, operacao, registro_id, versao, payload_json
     FROM sync_mudancas
     WHERE usuario_id = ? AND id > ?
     ORDER BY id ASC LIMIT 200`,
    [s.usuario_id, st.ultimo_pull_id || 0]
  );
  if (!r.ok) return r;
  if (r.dados.length === 0) return { ok: true, dados: { aplicadas: 0, conflitos: 0 } };

  const mutacoes = r.dados.map(row => {
    // r = [id, tabela, operacao, registro_id, versao, payload_json]
    const [mid, tabela, operacao, registroId, versao, payloadJson] = row;
    let payload = {};
    try { payload = JSON.parse(payloadJson); } catch (_) {}
    return {
      tabela: String(tabela),
      operacao: String(operacao),
      registro_id: String(registroId),
      versao: Number(versao),
      payload,
    };
  });

  const resp = await wpFetch('POST', '/sync/push', {
    dispositivo_id: st.wp_dispositivo_id,
    mutacoes,
  }, st.wp_token);

  if (!resp.ok) {
    return { ok: false, erro: { codigo: 'PUSH_HTTP_' + resp.status, mensagem: resp.json?.data?.message || resp.text?.substring(0,200) || 'falhou' } };
  }
  if (!resp.json?.success) {
    return { ok: false, erro: { codigo: 'PUSH_API', mensagem: resp.json?.data?.message || 'API retornou erro' } };
  }

  // Marca mudancas como aplicadas e atualiza cursor local
  const maxId = Number(r.dados[r.dados.length - 1][0]);
  db.exec(
    `UPDATE sync_mudancas SET aplicada = 1 WHERE id <= ? AND usuario_id = ?`,
    [maxId, s.usuario_id]
  );
  st.ultimo_pull_id = maxId;
  await writeState(st);

  return {
    ok: true,
    dados: {
      aplicadas: resp.json.data?.aplicadas || mutacoes.length,
      conflitos: resp.json.data?.conflitos || 0,
    },
  };
}

async function receberPull(db, st, s) {
  // Pega o cursor do servidor para ESTE dispositivo
  // (o WP usa dispositivo_id; o cursor na nossa sync_cursores e separado)
  const c = db.exec(
    `SELECT ultimo_id FROM sync_cursores WHERE usuario_id = ? AND dispositivo_id = ?`,
    [s.usuario_id, st.wp_dispositivo_id]
  );
  let since = 0;
  if (c.ok && c.dados.length > 0) since = Number(c.dados[0][0]) || 0;

  const params = new URLSearchParams({
    dispositivo_id: st.wp_dispositivo_id,
    since: String(since),
    limit: '200',
    offset: '0',
  });
  const resp = await wpFetch('GET', '/sync/pull?' + params.toString(), null, st.wp_token);
  if (!resp.ok) {
    return { ok: false, erro: { codigo: 'PULL_HTTP_' + resp.status, mensagem: resp.text?.substring(0,200) || 'falhou' } };
  }
  if (!resp.json?.success) {
    return { ok: false, erro: { codigo: 'PULL_API', mensagem: resp.json?.data?.message || 'API retornou erro' } };
  }
  const data = resp.json.data || {};
  const mudancas = data.items || data.mudancas || [];
  let aplicadas = 0;
  for (const m of mudancas) {
    if (aplicarMudanca(db, m, s)) aplicadas++;
  }
  // Atualiza cursor
  const proximo = data.proximo_cursor || data.next_cursor || since;
  if (proximo > since) {
    db.exec(
      `INSERT INTO sync_cursores(usuario_id, dispositivo_id, ultimo_id, atualizado_em)
       VALUES(?,?,?,?)
       ON CONFLICT(usuario_id, dispositivo_id) DO UPDATE SET ultimo_id=excluded.ultimo_id, atualizado_em=excluded.atualizado_em`,
      [s.usuario_id, st.wp_dispositivo_id, Number(proximo), new Date().toISOString()]
    );
  }
  return { ok: true, dados: { recebidas: aplicadas, total: mudancas.length } };
}

/**
 * Aplica 1 mudanca do servidor no SQLite local.
 * Formato esperado: { id, tabela, operacao: 'UPSERT'|'DELETE', payload: {...}, versao }
 */
function aplicarMudanca(db, m, s) {
  const tabela = m.tabela || m.entity;
  if (!TABELAS_SYNC[tabela]) return false; // tabela nao sincronizavel
  const cfg = TABELAS_SYNC[tabela];
  const oper = (m.operacao || m.op || 'UPSERT').toUpperCase();
  if (oper === 'DELETE') {
    // Soft-delete: marca deletado_em; hard-delete: apaga. Aqui hard-delete por simplicidade.
    db.exec(`DELETE FROM ${tabela} WHERE id = ? AND usuario_id = ?`, [m.registro_id || m.id, s.usuario_id]);
    return true;
  }
  // UPSERT: monta row a partir do payload + campos locais
  const row = { ...(m.payload || m.data || {}) };
  row.id = m.registro_id || m.id || row.id;
  if (!row.id) return false;
  // Garante usuario_id correto
  row.usuario_id = s.usuario_id;
  // Filtra colunas permitidas
  const cols = cfg.colunasSync.filter(c => row[c] !== undefined);
  if (cols.length === 0) return false;
  const placeholders = cols.map(() => '?').join(',');
  const updates = cols.filter(c => c !== 'id').map(c => `${c}=excluded.${c}`).join(',');
  const values = cols.map(c => row[c]);
  // Tenta inserir; se conflito, atualiza
  let r;
  try {
    r = db.exec(
      `INSERT INTO ${tabela} (${cols.join(',')}) VALUES (${placeholders})
       ON CONFLICT(id) DO UPDATE SET ${updates}`,
      values
    );
  } catch (e) {
    console.error('[sync] aplicarMudanca INSERT falhou:', tabela, e.message);
    return false;
  }
  return r.ok;
}

function countMudancas(db, s) {
  if (!s.usuario_id) return 0;
  const r = db.exec(
    `SELECT COUNT(*) AS c FROM sync_mudancas WHERE usuario_id = ? AND aplicada = 0`,
    [s.usuario_id]
  );
  if (!r.ok || !r.dados[0]) return 0;
  return Number(r.dados[0].c) || 0;
}

function countConflitos(db, s) {
  if (!s.usuario_id) return 0;
  const r = db.exec(
    `SELECT COUNT(*) AS c FROM sync_conflitos WHERE usuario_id = ? AND estado = 'PENDENTE'`,
    [s.usuario_id]
  );
  if (!r.ok || !r.dados[0]) return 0;
  return Number(r.dados[0].c) || 0;
}

// ============================================================================
// HELPER: enfileirar mudanca local (usado por outros core/*.js ao criar/alterar)
// ============================================================================

/**
 * Registra uma mudanca local na sync_mudancas para ser enviada no proximo push.
 * Outros core (tarefas, clientes, etc) devem chamar isto em suas operacoes de escrita.
 */
export function enfileirarMudanca(db, sessao, tabela, operacao, registroId, versao, payload) {
  if (!sessao?.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  if (!TABELAS_SYNC[tabela]) return { ok: false, erro: { codigo: 'TABELA_NAO_SINCRONIZAVEL' } };
  const agora = new Date().toISOString();
  return db.exec(
    `INSERT INTO sync_mudancas(usuario_id, dispositivo_id, tabela, registro_id, operacao, versao, payload_json, criado_em, aplicada)
     VALUES(?,?,?,?,?,?,?,?,0)`,
    [
      sessao.usuario_id,
      (window.__syncDispositivoId) || 'desktop-local',
      tabela,
      String(registroId),
      operacao,
      Number(versao || 1),
      JSON.stringify(payload || {}),
      agora,
    ]
  );
}
