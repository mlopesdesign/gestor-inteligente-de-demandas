// src/js/backend/permissoes.js — mapa de permissões por canal
// Conforme PADRAO-ML-LOPES-DESIGN.md §3.4 (permissão no backend, nunca só na tela).
//
// MVP: 1 usuário = admin de tudo. Quando entrar multi-usuário, trocar este mapa.

export const PERM_ROTA = {
  // auth
  'auth:cadastro':        'AUTH',
  'auth:login':           'AUTH',
  'auth:logout':          'AUTH',
  'sessao:atual':         'AUTH',

  // crud genérico
  'tarefas:listar':       'TAREFAS',
  'tarefas:obter':        'TAREFAS',
  'tarefas:criar':        'TAREFAS',
  'tarefas:atualizar':     'TAREFAS',
  'tarefas:concluir':      'TAREFAS',
  'tarefas:cancelar':      'TAREFAS',
  'tarefas:adiar':        'TAREFAS',
  'tarefas:reabrir':       'TAREFAS',
  'areas:listar':         'AREAS',
  'areas:criar':          'AREAS',
  'areas:atualizar':      'AREAS',
  'areas:excluir':        'AREAS',
  'clientes:listar':      'CLIENTES',
  'clientes:criar':       'CLIENTES',
  'clientes:atualizar':   'CLIENTES',
  'clientes:excluir':     'CLIENTES',
  'projetos:listar':      'PROJETOS',
  'projetos:criar':       'PROJETOS',
  'projetos:atualizar':   'PROJETOS',
  'projetos:excluir':     'PROJETOS',
  'inbox:listar':         'INBOX',
  'inbox:processar':      'INBOX',
  'cobranca:pendentes':   'COBRANCA',
  'cobranca:tick':        'COBRANCA',
  'cobranca:config':      'COBRANCA',
  'recorrencias:tick':    'COBRANCA',
  'sync:push':            'SYNC',
  'sync:pull':            'SYNC',
  'sync:conflitos':       'SYNC',
  'sync:resolver':        'SYNC',
  'sync:status':          'SYNC',
  'ia:parse':             'IA',
  'ia:sugerir':           'IA',
  'ia:status':            'IA',
  'config:obter':         'CONFIG',
  'config:atualizar':     'CONFIG',
  'config:exportar':      'CONFIG',
  'config:apagar':        'CONFIG',
  'busca:global':         'BUSCA',
};

export function podeExecutar(permsUsuario, canal) {
  const perm = PERM_ROTA[canal];
  if (!perm) return false; // rota desconhecida é negada
  return permsUsuario[perm] !== false; // default: true
}

export function permissoesAdmin() {
  // No MVP, todos os canais batem
  return new Proxy({}, { get: () => true });
}
