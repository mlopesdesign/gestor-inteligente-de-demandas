#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Adiciona botao Excluir em hoje.js, clientes.js, projetos.js"""
import os

# === hoje.js: tarefa ===
# Adiciona botão Excluir no renderLinha
path = r'E:\Projetos\LOPES FOCUS\src\js\telas\hoje.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """  <button data-id="${t.id}" data-v="${t.versao}" data-acao="editar">Editar</button>
  ${t.status !== 'CONCLUIDA' ? `<button data-id="${t.id}" data-v="${t.versao}" data-acao="concluir" class="success">Concluir</button>` : ''}
</span>"""
new = """  <button data-id="${t.id}" data-v="${t.versao}" data-acao="editar">Editar</button>
  ${t.status !== 'CONCLUIDA' ? `<button data-id="${t.id}" data-v="${t.versao}" data-acao="concluir" class="success">Concluir</button>` : ''}
  <button data-id="${t.id}" data-v="${t.versao}" data-acao="excluir" class="danger" title="Excluir permanentemente">Excluir</button>
</span>"""
if old in content and 'FIX v0.2.18' not in content:
    content = content.replace(old, new)
    # Adiciona handler
    old2 = "  else if (ac === 'editar') {"
    new2 = """  else if (ac === 'excluir') {
    if (confirm('Excluir esta tarefa? Esta ação não pode ser desfeita.')) {
      const r = await window.api('tarefas:excluir', { id, versao: v });
      if (!r.ok) { alert(r.erro?.mensagem || 'erro'); return; }
      carregar();
    }
  }
  else if (ac === 'editar') {"""
    content = content.replace(old2, new2, 1)
    # Marca
    content = '// FIX v0.2.18: botao Excluir adicionado em tarefas\n' + content
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: hoje.js')
else:
    print('ja tem ou nao achou: hoje.js')

# === clientes.js: cliente ===
path = r'E:\Projetos\LOPES FOCUS\src\js\telas\clientes.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """    <button data-id="${c.id}" data-acao="editar">Editar</button>
    ${!c.arquivado ? `<button data-id="${c.id}" data-acao="arquivar" class="danger">Arquivar</button>` : '<span style="color:var(--fg-3);">arquivado</span>'}"""
new = """    <button data-id="${c.id}" data-acao="editar">Editar</button>
    ${!c.arquivado ? `<button data-id="${c.id}" data-acao="arquivar" class="danger">Arquivar</button>` : '<span style="color:var(--fg-3);">arquivado</span>'}
    <button data-id="${c.id}" data-acao="excluir" class="danger" title="Excluir permanentemente">Excluir</button>"""
if old in content and 'FIX v0.2.18' not in content:
    content = content.replace(old, new)
    # Adiciona handler
    old2 = "  if (ac === 'editar') {"
    new2 = """  if (ac === 'excluir') {
    if (confirm('Excluir este cliente? Esta ação não pode ser desfeita.')) {
      const r = await window.api('clientes:excluir', { id });
      if (!r.ok) { alert(r.erro?.mensagem || 'erro'); return; }
      carregar();
    }
  }
  if (ac === 'editar') {"""
    content = content.replace(old2, new2, 1)
    content = '// FIX v0.2.18: botao Excluir adicionado em clientes\n' + content
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: clientes.js')
else:
    print('ja tem ou nao achou: clientes.js')

# === projetos.js: projeto ===
path = r'E:\Projetos\LOPES FOCUS\src\js\telas\projetos.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Vou ver qual o botão atual
import re
botoes = re.findall(r'<button[^>]*data-acao[^>]*>[^<]+</button>', content)
print('botoes atuais em projetos.js:', botoes)
