// src/js/backend/permissoes.js — mapa de permissoes por canal
// Conforme PADRAO-ML-LOPES-DESIGN.md §3.4 (permissao no backend, nunca so na tela).
//
// MVP: 1 usuario = admin de tudo. Quando entrar multi-usuario, trocar este mapa.

export const PERM_ROTA = {
  // auth
  'auth:cadastro':        'AUTH',
  'auth:login':           'AUTH',
  'auth:logout':          'AUTH',
  'sessao:atual':         'AUTH',
  'sessao:listarUsuarios': 'AUTH',

  // tarefas
  'tarefas:listar':       'TAREFAS',
  'tarefas:obter':        'TAREFAS',
  'tarefas:criar':        'TAREFAS',
  'tarefas:atualizar':    'TAREFAS',
  'tarefas:concluir':     'TAREFAS',
  'tarefas:cancelar':     'TAREFAS',
  'tarefas:adiar':        'TAREFAS',
  'tarefas:reabrir':      'TAREFAS',
  'tarefas:arquivar':     'TAREFAS',
  'tarefas:excluir':      'TAREFAS',
  'tarefas:adicionarSubtarefa': 'TAREFAS',
  'tarefas:toggleSubtarefa':    'TAREFAS',
  'tarefas:excluirSubtarefa':   'TAREFAS',

  // areas
  'areas:listar':         'AREAS',
  'areas:criar':          'AREAS',
  'areas:atualizar':      'AREAS',
  'areas:excluir':        'AREAS',

  // clientes
  'clientes:listar':      'CLIENTES',
  'clientes:obter':       'CLIENTES',
  'clientes:criar':       'CLIENTES',
  'clientes:atualizar':   'CLIENTES',
  'clientes:arquivar':    'CLIENTES',
  'clientes:excluir':     'CLIENTES',

  // projetos
  'projetos:listar':      'PROJETOS',
  'projetos:obter':       'PROJETOS',
  'projetos:criar':       'PROJETOS',
  'projetos:atualizar':   'PROJETOS',
  'projetos:arquivar':    'PROJETOS',
  'projetos:concluir':    'PROJETOS',
  'projetos:excluir':     'PROJETOS',

  // cobranca / recorrencia
  'cobranca:pendentes':   'COBRANCA',
  'cobranca:tick':        'COBRANCA',
  'cobranca:config':      'COBRANCA',
  'recorrencias:tick':    'COBRANCA',

  // sync
  'sync:login':           'SYNC',
  'sync:logout':          'SYNC',
  'sync:executar':        'SYNC',
  'sync:push':            'SYNC',
  'sync:pull':            'SYNC',
  'sync:conflitos':       'SYNC',
  'sync:resolver':        'SYNC',
  'sync:status':          'SYNC',

  // ia
  'ia:parse':             'IA',
  'ia:sugerir':           'IA',
  'ia:status':            'IA',

  // config
  'config:obter':         'CONFIG',
  'config:atualizar':     'CONFIG',
  'config:exportar':      'CONFIG',
  'config:apagar':        'CONFIG',

  // busca
  'busca:global':         'BUSCA',

  // backup (v0.2.12: manual + automatico)
  'backup:criar':         'BACKUP',
  'backup:listar':        'BACKUP',
  'backup:restaurar':     'BACKUP',
  'backup:excluir':       'BACKUP',
  'backup:obterAuto':     'BACKUP',
  'backup:salvarAuto':    'BACKUP',
  'backup:aplicarAuto':   'BACKUP',
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
