// src/js/backend/servidor.js — despacha canal -> core/* (PADRAO §3.3, §3.4)
// Permissao verificada aqui, antes da regra rodar.

import { db, enfileirarDadosLegados } from './db.js';
import { sessao, toast } from './ambiente.js';
import { podeExecutar, permissoesAdmin } from './permissoes.js';

import * as authCore from './core/auth.js';
import * as tarefasCore from './core/tarefas.js';
import * as areasCore from './core/areas.js';
import * as clientesCore from './core/clientes.js';
import * as projetosCore from './core/projetos.js';
import * as cobrancasCore from './core/cobrancas.js';
import * as recorrenciasCore from './core/recorrencias.js';
import * as configCore from './core/config.js';
import * as buscaCore from './core/busca.js';
import * as backupCore from './core/backup.js';
import { clientes as clientesStub, projetos as projetosStub, recorrencias as recorrenciasStub, ia as iaCore } from './core/stubs.js';
import * as syncCore from './core/sync.js';

export const servidor = {
  async processar(canal, payload = {}, sessaoAlvo) {
    const s = sessaoAlvo || sessao;
    // 1. Verifica permissao
    if (!podeExecutar(permissoesAdmin(), canal)) {
      return { ok: false, erro: { codigo: 'SEM_PERMISSAO', mensagem: 'Sem permissao para ' + canal } };
    }
    // 2. Despacha
    try {
      switch (canal) {
        // auth
        case 'auth:cadastro':   return authCore.cadastro(db, payload, s);
        case 'auth:login':      return authCore.login(db, payload, s);
        case 'auth:logout':     return authCore.logout(db, payload, s);
        case 'sessao:atual':    return authCore.sessaoAtual(db, payload, s);
        case 'sessao:listarUsuarios': return authCore.listarUsuarios(db, payload, s);

        // tarefas
        case 'tarefas:listar':             return tarefasCore.listar(db, payload, s);
        case 'tarefas:obter':              return tarefasCore.obter(db, payload, s);
        case 'tarefas:criar':              return tarefasCore.criar(db, payload, s);
        case 'tarefas:atualizar':          return tarefasCore.atualizar(db, payload, s);
        case 'tarefas:concluir':           return tarefasCore.concluir(db, payload, s);
        case 'tarefas:cancelar':           return tarefasCore.cancelar(db, payload, s);
        case 'tarefas:adiar':              return tarefasCore.adiar(db, payload, s);
        case 'tarefas:reabrir':            return tarefasCore.reabrir(db, payload, s);
        case 'tarefas:arquivar':           return tarefasCore.arquivar(db, payload, s);
        case 'tarefas:excluir':            return tarefasCore.excluir(db, payload, s);
        case 'tarefas:adicionarSubtarefa': return tarefasCore.adicionarSubtarefa(db, payload, s);
        case 'tarefas:toggleSubtarefa':    return tarefasCore.toggleSubtarefa(db, payload, s);
        case 'tarefas:excluirSubtarefa':   return tarefasCore.excluirSubtarefa(db, payload, s);

        // areas
        case 'areas:listar':         return areasCore.listar(db, payload, s);
        case 'areas:criar':          return areasCore.criar(db, payload, s);
        case 'areas:atualizar':      return areasCore.atualizar(db, payload, s);
        case 'areas:excluir':        return areasCore.excluir(db, payload, s);

        // clientes
        case 'clientes:listar':      return clientesCore.listar(db, payload, s);
        case 'clientes:obter':       return clientesCore.obter(db, payload, s);
        case 'clientes:criar':       return clientesCore.criar(db, payload, s);
        case 'clientes:atualizar':   return clientesCore.atualizar(db, payload, s);
        case 'clientes:arquivar':    return clientesCore.arquivar(db, payload, s);
        case 'clientes:excluir':     return clientesCore.excluir(db, payload, s);

        // projetos
        case 'projetos:listar':      return projetosCore.listar(db, payload, s);
        case 'projetos:obter':       return projetosCore.obter(db, payload, s);
        case 'projetos:criar':       return projetosCore.criar(db, payload, s);
        case 'projetos:atualizar':   return projetosCore.atualizar(db, payload, s);
        case 'projetos:arquivar':    return projetosCore.arquivar(db, payload, s);
        case 'projetos:concluir':    return projetosCore.concluir(db, payload, s);
        case 'projetos:excluir':     return projetosCore.excluir(db, payload, s);

        // cobranca / recorrencia
        case 'cobranca:pendentes':   return cobrancasCore.pendentes(db, payload, s);
        case 'cobranca:tick':        return cobrancasCore.tick(db, payload, s);
        case 'cobranca:config':      return cobrancasCore.config(db, payload, s);
        case 'recorrencias:tick':    return recorrenciasCore.tick(db, payload, s);

        // sync (v0.2.24: implementado)
        case 'sync:login':           return syncCore.login(db, payload, s);
        case 'sync:logout':          return syncCore.logout(db, payload, s);
        case 'sync:executar':        return syncCore.executar(db, payload, s);
        case 'sync:push':            return syncCore.push(db, payload, s);
        case 'sync:pull':            return syncCore.pull(db, payload, s);
        case 'sync:conflitos':       return syncCore.listarConflitos(db, payload, s);
        case 'sync:resolver':        return syncCore.resolver(db, payload, s);
        case 'sync:status':          return syncCore.status(db, payload, s);

        // db (migration one-shot, v0.2.47)
        case 'db:enfileirarDadosLegados': return enfileirarDadosLegados(payload?.usuarioId);

        // ia (stub)
        case 'ia:status':            return iaCore.status(db, payload, s);
        case 'ia:parse':             return iaCore.parseTarefa(db, payload, s);
        case 'ia:sugerir':           return iaCore.sugerir(db, payload, s);

        // config
        case 'config:obter':         return configCore.obter(db, payload, s);
        case 'config:atualizar':     return configCore.atualizar(db, payload, s);
        case 'config:exportar':      return configCore.exportar(db, payload, s);
        case 'config:apagar':        return configCore.apagar(db, payload, s);

        // busca
        case 'busca:global':         return buscaCore.global_(db, payload, s);

        // backup (v0.2.12: manual + automatico)
        case 'backup:criar':         return backupCore.criar(db, payload, s);
        case 'backup:listar':        return backupCore.listar(db, payload, s);
        case 'backup:restaurar':     return backupCore.restaurar(db, payload, s);
        case 'backup:excluir':       return backupCore.excluir(db, payload, s);
        case 'backup:obterAuto':     return backupCore.obterAuto(db, payload, s);
        case 'backup:salvarAuto':    return backupCore.salvarAuto(db, payload, s);
        case 'backup:aplicarAuto':   return backupCore.aplicarAuto(db, payload, s);

        default:
          return { ok: false, erro: { codigo: 'CANAL_DESCONHECIDO', mensagem: 'Canal inexistente: ' + canal } };
      }
    } catch (e) {
      console.error('[servidor]', canal, e);
      return { ok: false, erro: { codigo: 'INTERNO', mensagem: e.message } };
    }
  },
};
