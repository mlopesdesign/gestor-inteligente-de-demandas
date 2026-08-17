#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Adiciona funcao excluir nos 3 cores (tarefas, clientes, projetos)"""
import os

# 1) tarefas.js - DELETE só se não tiver subtarefas pendentes (são todas cascade)
# Mas como subtarefas é ON DELETE CASCADE, OK. Bloqueia se houver outras tarefas linkadas.
# Na verdade tarefa é o fim da linha, pode deletar direto.
tarefas_adicionar = '''

// FIX v0.2.18: exclusao real da tarefa (era só "concluir" antes)
export function excluir(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  const r = db.exec(
    `DELETE FROM tarefas WHERE id=? AND usuario_id=?`,
    [id, sessao.usuario_id]
  );
  if (!r.ok) return r;
  if (r.dados.changes === 0) return { ok: false, erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'tarefa nao encontrada' } };
  auditar(db, sessao, 'tarefas', id, 'excluida', {});
  return { ok: true, dados: { id } };
}
'''

# 2) clientes.js - bloqueia se há tarefas/projetos vinculados
clientes_adicionar = '''

// FIX v0.2.18: exclusao real do cliente. Bloqueia se há tarefas/projetos vinculados.
export function excluir(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  // Verifica uso em tarefas
  const usoT = db.exec(`SELECT COUNT(*) AS c FROM tarefas WHERE cliente_id=? AND usuario_id=?`, [id, sessao.usuario_id]);
  if (usoT.ok && usoT.dados[0]?.c > 0) {
    return { ok: false, erro: { codigo: 'EM_USO', mensagem: 'cliente possui ' + usoT.dados[0].c + ' tarefa(s) vinculada(s). Reatribua antes de excluir.' } };
  }
  // Verifica uso em projetos
  const usoP = db.exec(`SELECT COUNT(*) AS c FROM projetos WHERE cliente_id=? AND usuario_id=?`, [id, sessao.usuario_id]);
  if (usoP.ok && usoP.dados[0]?.c > 0) {
    return { ok: false, erro: { codigo: 'EM_USO', mensagem: 'cliente possui ' + usoP.dados[0].c + ' projeto(s) vinculado(s). Reatribua antes de excluir.' } };
  }
  const r = db.exec(
    `DELETE FROM clientes WHERE id=? AND usuario_id=?`,
    [id, sessao.usuario_id]
  );
  if (!r.ok) return r;
  if (r.dados.changes === 0) return { ok: false, erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'cliente nao encontrado' } };
  auditar(db, sessao, 'clientes', id, 'excluido', {});
  return { ok: true, dados: { id } };
}
'''

# 3) projetos.js - bloqueia se há tarefas vinculadas
projetos_adicionar = '''

// FIX v0.2.18: exclusao real do projeto. Bloqueia se há tarefas vinculadas.
export function excluir(db, payload, sessao) {
  if (!sessao.usuario_id) return { ok: false, erro: { codigo: 'NAO_AUTENTICADO' } };
  const { id } = payload;
  if (!id) return { ok: false, erro: { codigo: 'VALIDACAO', mensagem: 'id obrigatorio' } };
  const uso = db.exec(`SELECT COUNT(*) AS c FROM tarefas WHERE projeto_id=? AND usuario_id=?`, [id, sessao.usuario_id]);
  if (uso.ok && uso.dados[0]?.c > 0) {
    return { ok: false, erro: { codigo: 'EM_USO', mensagem: 'projeto possui ' + uso.dados[0].c + ' tarefa(s) vinculada(s). Reatribua antes de excluir.' } };
  }
  const r = db.exec(
    `DELETE FROM projetos WHERE id=? AND usuario_id=?`,
    [id, sessao.usuario_id]
  );
  if (!r.ok) return r;
  if (r.dados.changes === 0) return { ok: false, erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'projeto nao encontrado' } };
  auditar(db, sessao, 'projetos', id, 'excluido', {});
  return { ok: true, dados: { id } };
}
'''

edits = [
    (r'E:\Projetos\LOPES FOCUS\src\js\backend\core\tarefas.js', tarefas_adicionar),
    (r'E:\Projetos\LOPES FOCUS\src\js\backend\core\clientes.js', clientes_adicionar),
    (r'E:\Projetos\LOPES FOCUS\src\js\backend\core\projetos.js', projetos_adicionar),
]

for path, addition in edits:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'FIX v0.2.18' in content and 'excluir' in content:
        print(f'  ja tem: {path}')
        continue
    # Append no final (sem duplicar)
    if not content.endswith('\n'):
        content += '\n'
    content += addition
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'  OK: {path}')
