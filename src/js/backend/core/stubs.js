// src/js/backend/core/stubs.js — implementação mínima p/ rotas que ainda não foram feitas.
// Cada stub retorna { ok: true, dados: [] } ou erro de "NAO_AUTENTICADO" se a sessão faltar.
// Vai ser substituído por uma implementação real nos próximos commits.

function naoAutenticado(sessao) {
  if (!sessao || !sessao.usuario_id) {
    return { ok: false, erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'login necessário' } };
  }
  return null;
}

export const clientes = {
  listar(db, p, s) { return naoAutenticado(s) || { ok: true, dados: [] }; },
  criar(db, p, s) { return naoAutenticado(s) || { ok: false, erro: { codigo: 'NAO_IMPLEMENTADO', mensagem: 'em construção' } }; },
  atualizar(db, p, s) { return naoAutenticado(s) || { ok: false, erro: { codigo: 'NAO_IMPLEMENTADO' } }; },
  excluir(db, p, s) { return naoAutenticado(s) || { ok: false, erro: { codigo: 'NAO_IMPLEMENTADO' } }; },
};

export const projetos = {
  listar(db, p, s) { return naoAutenticado(s) || { ok: true, dados: [] }; },
  criar(db, p, s) { return naoAutenticado(s) || { ok: false, erro: { codigo: 'NAO_IMPLEMENTADO' } }; },
  atualizar(db, p, s) { return naoAutenticado(s) || { ok: false, erro: { codigo: 'NAO_IMPLEMENTADO' } }; },
  excluir(db, p, s) { return naoAutenticado(s) || { ok: false, erro: { codigo: 'NAO_IMPLEMENTADO' } }; },
};

export const recorrencias = {
  tick(db, p, s) { return naoAutenticado(s) || { ok: true, dados: { proximas_geradas: 0, recorrencias_encerradas: 0 } }; },
};

export const sync = {
  push(db, p, s) { return naoAutenticado(s) || { ok: true, dados: { aplicadas: 0, conflitos: 0, detalhes: [] } }; },
  pull(db, p, s) { return naoAutenticado(s) || { ok: true, dados: { mudancas: [], proximo_cursor: 0 } }; },
  listarConflitos(db, p, s) { return naoAutenticado(s) || { ok: true, dados: [] }; },
  resolver(db, p, s) { return naoAutenticado(s) || { ok: false, erro: { codigo: 'NAO_IMPLEMENTADO' } }; },
  status(db, p, s) { return naoAutenticado(s) || { ok: true, dados: { online: false, mensagem: 'sync entre dispositivos: em construção' } }; },
};

export const ia = {
  status(db, p, s) { return naoAutenticado(s) || { ok: true, dados: { disponivel: false, modelo: 'fallback-heuristica', prompt_versao: 'v1' } }; },
  parseTarefa(db, p, s) { return naoAutenticado(s) || { ok: true, dados: { fallback: true, motivo: 'em construção' } }; },
  sugerir(db, p, s) { return naoAutenticado(s) || { ok: true, dados: { fallback: true } }; },
};

export const config = {
  obter(db, p, s) { return naoAutenticado(s) || { ok: true, dados: {} }; },
  atualizar(db, p, s) { return naoAutenticado(s) || { ok: true, dados: {} }; },
  exportar(db, p, s) { return naoAutenticado(s) || { ok: false, erro: { codigo: 'NAO_IMPLEMENTADO' } }; },
  apagar(db, p, s) { return naoAutenticado(s) || { ok: false, erro: { codigo: 'NAO_IMPLEMENTADO' } }; },
};
