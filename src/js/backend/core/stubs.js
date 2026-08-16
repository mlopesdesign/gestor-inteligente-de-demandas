// src/js/backend/core/stubs.js — apenas placeholders para canais nao implementados nesta sprint
// (sync, ia, inbox que ficam pra depois)

export const clientes = {}; // redirecionado via servidor.js
export const projetos = {};
export const recorrencias = {
  tick(db, p, s) { return { ok: true, dados: { ocorrencias_geradas: 0 } }; },
};
export const sync = {
  push(db, p, s) { return { ok: true, dados: { aplicadas: 0, conflitos: 0 } }; },
  pull(db, p, s) { return { ok: true, dados: { mudancas: [], proximo_cursor: 0 } }; },
  listarConflitos(db, p, s) { return { ok: true, dados: [] }; },
  resolver(db, p, s) { return { ok: true, dados: { ok: true } }; },
  status(db, p, s) { return { ok: true, dados: { online: false, mensagem: 'sync em construcao' } }; },
};
export const ia = {
  status(db, p, s) { return { ok: true, dados: { disponivel: false, motivo: 'IA desabilitada por padrao no MVP' } }; },
  parseTarefa(db, p, s) { return { ok: true, dados: { fallback: true, motivo: 'em construcao' } }; },
  sugerir(db, p, s) { return { ok: true, dados: { fallback: true } }; },
};
