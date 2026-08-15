// src/js/backend/core/auth.js — cadastro, login, sessão
// Funções puras: recebem db como primeiro parâmetro (PADRAO §3.2).
//
// NOTA MVP: hash de senha é argon2id via biblioteca JS. Implementação real
// depende de pacote em src/js/vendor/. Aqui uso SHA-256 + salt como placeholder
// até o argon2-js ser adicionado (vide AGENTS, tarefa de hardening).

import { UlidFactory } from '../ulid.js';

const SALT = 'gestor-ml-lopes-2026';

async function hashSenha(senha) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(SALT + senha));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function cadastro(db, payload, sessao) {
  const { email, senha, nome, dispositivoNome, sistema, appVersao } = payload;
  if (!email || !senha || !nome) {
    return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'email, senha e nome são obrigatórios' } };
  }
  if (senha.length < 8) {
    return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'senha deve ter pelo menos 8 caracteres' } };
  }
  const emailNorm = email.toLowerCase().trim();
  // checa duplicado
  const r = db.exec('SELECT id FROM usuarios WHERE email = ?', [emailNorm]);
  if (r.ok && r.dados.length > 0) {
    return { ok: false, erro: { codigo: 'EMAIL_DUPLICADO', mensagem: 'email já cadastrado' } };
  }
  const id = UlidFactory.next();
  const agora = new Date().toISOString();
  const senhaHash = await hashSenha(senha);
  const r2 = db.exec(
    `INSERT INTO usuarios(id, email, senha_hash, nome, criado_em, atualizado_em, versao, dono_id)
     VALUES(?,?,?,?,?,?,1,?)`,
    [id, emailNorm, senhaHash, nome, agora, agora, id]
  );
  if (!r2.ok) return { ok: false, erro: { codigo: 'INTERNO', mensagem: r2.erro } };
  // Auto-login
  return login(db, { email: emailNorm, senha, dispositivoNome, sistema, appVersao }, sessao);
}

export async function login(db, payload, sessao) {
  const { email, senha, dispositivoNome, sistema, appVersao } = payload;
  if (!email || !senha) {
    return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'credenciais obrigatórias' } };
  }
  const emailNorm = email.toLowerCase().trim();
  const r = db.exec('SELECT id, nome, senha_hash FROM usuarios WHERE email = ?', [emailNorm]);
  if (!r.ok || r.dados.length === 0) {
    return { ok: false, erro: { codigo: 'CREDENCIAIS_INVALIDAS', mensagem: 'credenciais inválidas' } };
  }
  const u = r.dados[0];
  const senhaHash = await hashSenha(senha);
  if (senhaHash !== u.senha_hash) {
    return { ok: false, erro: { codigo: 'CREDENCIAIS_INVALIDAS', mensagem: 'credenciais inválidas' } };
  }
  // Registra/atualiza dispositivo
  const dispId = await upsertDispositivo(db, u.id, dispositivoNome || 'Desconhecido', sistema || 'windows', appVersao || '0.1.0');
  // Cria sessão
  const tokenId = UlidFactory.next();
  const token = await gerarToken();
  const tokenHash = await hashSenha(token); // reusa helper p/ hash
  const agora = new Date().toISOString();
  const expira = new Date(Date.now() + 24*3600*1000).toISOString();
  db.exec(
    `INSERT INTO sessoes(id, usuario_id, token_hash, criada_em, expira_em, dispositivo_id) VALUES(?,?,?,?,?,?)`,
    [tokenId, u.id, tokenHash, agora, expira, dispId]
  );
  return {
    ok: true,
    dados: {
      autenticado: true,
      usuario_id: u.id,
      email: emailNorm,
      nome: u.nome,
      token,
      dispositivo_id: dispId,
      expira_em: expira,
    },
  };
}

export async function logout(db, payload, sessao) {
  if (!sessao.token) return { ok: true, dados: {} };
  const tokenHash = await hashSenha(sessao.token);
  db.exec('UPDATE sessoes SET revogada_em = ? WHERE token_hash = ?', [new Date().toISOString(), tokenHash]);
  return { ok: true, dados: {} };
}

export async function sessaoAtual(db, payload, sessaoAlvo) {
  if (!sessaoAlvo || !sessaoAlvo.token) {
    return { ok: true, dados: { autenticado: false } };
  }
  const tokenHash = await hashSenha(sessaoAlvo.token);
  const r = db.exec(
    `SELECT s.id, s.usuario_id, s.expira_em, s.revogada_em, u.email, u.nome
     FROM sessoes s JOIN usuarios u ON s.usuario_id = u.id
     WHERE s.token_hash = ?`,
    [tokenHash]
  );
  if (!r.ok || r.dados.length === 0) {
    return { ok: true, dados: { autenticado: false } };
  }
  const s = r.dados[0];
  if (s.revogada_em) return { ok: true, dados: { autenticado: false } };
  if (new Date(s.expira_em) < new Date()) return { ok: true, dados: { autenticado: false } };
  return {
    ok: true,
    dados: {
      autenticado: true,
      usuario_id: s.usuario_id,
      email: s.email,
      nome: s.nome,
      token: sessaoAlvo.token,
      expira_em: s.expira_em,
    },
  };
}

async function gerarToken() {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function upsertDispositivo(db, usuarioId, nome, sistema, appVersao) {
  const r = db.exec(
    'SELECT id FROM dispositivos WHERE usuario_id = ? AND sistema = ? AND app_versao = ? AND revogado_em IS NULL LIMIT 1',
    [usuarioId, sistema, appVersao]
  );
  const agora = new Date().toISOString();
  if (r.ok && r.dados.length > 0) {
    const id = r.dados[0].id;
    db.exec('UPDATE dispositivos SET nome = ?, ultimo_acesso_em = ? WHERE id = ?', [nome, agora, id]);
    return id;
  }
  const id = UlidFactory.next();
  db.exec(
    `INSERT INTO dispositivos(id, usuario_id, nome, sistema, app_versao, ultimo_acesso_em, criado_em, versao) VALUES(?,?,?,?,?,?,?,1)`,
    [id, usuarioId, nome, sistema, appVersao, agora, agora]
  );
  return id;
}
