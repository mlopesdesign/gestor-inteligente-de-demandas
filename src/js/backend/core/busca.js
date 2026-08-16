// src/js/backend/core/busca.js — busca global
// Conforme PROJETO §8.

export function global_(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const q = String(payload?.q || '').trim();
  if (q.length < 2) return { ok: true, dados: { tarefas: [], projetos: [], clientes: [], areas: [] } };
  const like = '%' + q + '%';
  const uid = sessao.usuario_id;
  const tarefas = db.exec(
    `SELECT t.id, t.titulo, t.status, t.prioridade, t.vencimento_em, 'tarefa' AS tipo
     FROM tarefas t WHERE t.usuario_id = ? AND (t.titulo LIKE ? OR t.descricao LIKE ?) LIMIT 30`,
    [uid, like, like]
  );
  const projetos = db.exec(
    `SELECT p.id, p.titulo, p.status, 'projeto' AS tipo FROM projetos p WHERE p.usuario_id = ? AND (p.titulo LIKE ? OR p.descricao LIKE ?) LIMIT 30`,
    [uid, like, like]
  );
  const clientes = db.exec(
    `SELECT c.id, c.nome AS titulo, c.organizacao, 'cliente' AS tipo FROM clientes c WHERE c.usuario_id = ? AND (c.nome LIKE ? OR c.organizacao LIKE ? OR c.email LIKE ?) LIMIT 30`,
    [uid, like, like, like]
  );
  const areas = db.exec(
    `SELECT a.id, a.nome AS titulo, a.cor, 'area' AS tipo FROM areas a WHERE a.usuario_id = ? AND a.nome LIKE ? LIMIT 30`,
    [uid, like]
  );
  return {
    ok: true,
    dados: {
      tarefas: tarefas.ok ? tarefas.dados : [],
      projetos: projetos.ok ? projetos.dados : [],
      clientes: clientes.ok ? clientes.dados : [],
      areas: areas.ok ? areas.dados : [],
    },
  };
}
