// src/js/backend/servidor.js — despacha canal → core/* (PADRAO §3.3, §3.4)
// Permissão verificada aqui, antes da regra rodar.

import { db } from './db.js';
import { sessao, toast } from './ambiente.js';
import { podeExecutar, permissoesAdmin } from './permissoes.js';

import * as authCore from './core/auth.js';
import * as tarefasCore from './core/tarefas.js';
import * as areasCore from './core/areas.js';
import { clientes as clientesCore, projetos as projetosCore, recorrencias as recorrenciasCore, sync as syncCore, ia as iaCore, config as configCore } from './core/stubs.js';

export const servidor = {
  async processar(canal, payload = {}, sessaoAlvo) {
    const s = sessaoAlvo || sessao;
    // 1. Verifica permissão
    if (!podeExecutar(permissoesAdmin(), canal)) {
      return { ok: false, erro: { codigo: 'SEM_PERMISSAO', mensagem: 'Sem permissão para ' + canal } };
    }

    // 2. Despacha
    try {
      switch (canal) {
        // auth
        case 'auth:cadastro':   return authCore.cadastro(db, payload, s);
        case 'auth:login':      return authCore.login(db, payload, s);
        case 'auth:logout':     return authCore.logout(db, payload, s);
        case 'sessao:atual':    return authCore.sessaoAtual(db, payload, s);

        // tarefas
        case 'tarefas:listar':      return tarefasCore.listar(db, payload, s);
        case 'tarefas:obter':       return tarefasCore.obter(db, payload, s);
        case 'tarefas:criar':       return tarefasCore.criar(db, payload, s);
        case 'tarefas:atualizar':   return tarefasCore.atualizar(db, payload, s);
        case 'tarefas:concluir':    return tarefasCore.concluir(db, payload, s);
        case 'tarefas:cancelar':    return tarefasCore.cancelar(db, payload, s);
        case 'tarefas:adiar':       return tarefasCore.adiar(db, payload, s);
        case 'tarefas:reabrir':     return tarefasCore.reabrir(db, payload, s);

        // áreas
        case 'areas:listar':      return areasCore.listar(db, payload, s);
        case 'areas:criar':       return areasCore.criar(db, payload, s);
        case 'areas:atualizar':   return areasCore.atualizar(db, payload, s);
        case 'areas:excluir':     return areasCore.excluir(db, payload, s);

        // clientes
        case 'clientes:listar':    return clientesCore.listar(db, payload, s);
        case 'clientes:criar':     return clientesCore.criar(db, payload, s);
        case 'clientes:atualizar': return clientesCore.atualizar(db, payload, s);
        case 'clientes:excluir':   return clientesCore.excluir(db, payload, s);

        // projetos
        case 'projetos:listar':    return projetosCore.listar(db, payload, s);
        case 'projetos:criar':     return projetosCore.criar(db, payload, s);
        case 'projetos:atualizar': return projetosCore.atualizar(db, payload, s);
        case 'projetos:excluir':   return projetosCore.excluir(db, payload, s);

        // cobrança / recorrência
        case 'cobranca:pendentes': return cobrancasCore.pendentes(db, payload, s);
        case 'cobranca:tick':      return cobrancasCore.tick(db, payload, s);
        case 'cobranca:config':    return cobrancasCore.config(db, payload, s);
        case 'recorrencias:tick':  return recorrenciasCore.tick(db, payload, s);

        // sync
        case 'sync:push':      return syncCore.push(db, payload, s);
        case 'sync:pull':      return syncCore.pull(db, payload, s);
        case 'sync:conflitos': return syncCore.listarConflitos(db, payload, s);
        case 'sync:resolver':  return syncCore.resolver(db, payload, s);
        case 'sync:status':    return syncCore.status(db, payload, s);

        // ia
        case 'ia:status':    return iaCore.status(db, payload, s);
        case 'ia:parse':     return iaCore.parseTarefa(db, payload, s);
        case 'ia:sugerir':   return iaCore.sugerir(db, payload, s);

        // config
        case 'config:obter':     return configCore.obter(db, payload, s);
        case 'config:atualizar': return configCore.atualizar(db, payload, s);
        case 'config:exportar':  return configCore.exportar(db, payload, s);
        case 'config:apagar':    return configCore.apagar(db, payload, s);

        // busca
        case 'busca:global': return { ok: true, dados: [] }; // placeholder

        default:
          return { ok: false, erro: { codigo: 'CANAL_DESCONHECIDO', mensagem: 'Canal inexistente: ' + canal } };
      }
    } catch (e) {
      console.error('[servidor]', canal, e);
      return { ok: false, erro: { codigo: 'INTERNO', mensagem: e.message } };
    }
  }
};
