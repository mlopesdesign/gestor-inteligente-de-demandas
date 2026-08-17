#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Adiciona botao Excluir (v2 - regex mais robusto)"""
import os
import re

def patch(path, marker_old, addition_after, addition_handler=None):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'FIX v0.2.18' in content:
        print(f'  ja tem: {os.path.basename(path)}')
        return False
    if marker_old in content:
        content = content.replace(marker_old, marker_old + addition_after, 1)
        if addition_handler:
            content = content.replace(marker_old, marker_old + addition_handler, 1)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  OK: {os.path.basename(path)}')
        return True
    print(f'  NAO ACHOU: {os.path.basename(path)}')
    return False

# === hoje.js: tarefa (insere após o botão Concluir) ===
# O texto real: <button data-id="${t.id}" data-v="${t.versao}" data-acao="concluir" class="success">Concluir</button>
hoje_path = r'E:\Projetos\LOPES FOCUS\src\js\telas\hoje.js'
hoje_marker = '<button data-id="${t.id}" data-v="${t.versao}" data-acao="concluir" class="success">Concluir</button>'
hoje_add = '\n  <button data-id="${t.id}" data-v="${t.versao}" data-acao="excluir" class="danger" title="Excluir permanentemente">Excluir</button>'
hoje_handler_marker = "else if (ac === 'editar') {"
hoje_handler_add = """
  else if (ac === 'excluir') {
    if (confirm('Excluir esta tarefa? Esta ação não pode ser desfeita.')) {
      const r = await window.api('tarefas:excluir', { id, versao: v });
      if (!r.ok) { alert(r.erro?.mensagem || 'erro'); return; }
      carregar();
    }
  }
"""
patch(hoje_path, hoje_marker, hoje_add)
patch(hoje_path, hoje_handler_marker, hoje_handler_add)

# === clientes.js: cliente (insere após o botão Arquivar) ===
cli_path = r'E:\Projetos\LOPES FOCUS\src\js\telas\clientes.js'
cli_marker = "${!c.arquivado ? `<button data-id=\"${c.id}\" data-acao=\"arquivar\" class=\"danger\">Arquivar</button>` : '<span style=\"color:var(--fg-3);\">arquivado</span>'}"
cli_add = "\n    <button data-id=\"${c.id}\" data-acao=\"excluir\" class=\"danger\" title=\"Excluir permanentemente\">Excluir</button>"
cli_handler_marker = "if (ac === 'editar') {"
cli_handler_add = """  if (ac === 'excluir') {
    if (confirm('Excluir este cliente? Esta ação não pode ser desfeita.')) {
      const r = await window.api('clientes:excluir', { id });
      if (!r.ok) { alert(r.erro?.mensagem || 'erro'); return; }
      carregar();
    }
  }
"""
patch(cli_path, cli_marker, cli_add)
patch(cli_path, cli_handler_marker, cli_handler_add)

# === projetos.js: projeto (insere após Concluir) ===
proj_path = r'E:\Projetos\LOPES FOCUS\src\js\telas\projetos.js'
proj_marker = '<button data-id="${p.id}" data-v="${p.versao}" data-acao="concluir" class="success"> Concluir</button>'
proj_add = '\n    <button data-id="${p.id}" data-v="${p.versao}" data-acao="excluir" class="danger" title="Excluir permanentemente">Excluir</button>'
proj_handler_marker = "} else if (ac === 'tarefas') {"
proj_handler_add = """  } else if (ac === 'excluir') {
    if (confirm('Excluir este projeto? Esta ação não pode ser desfeita.')) {
      const r = await window.api('projetos:excluir', { id, versao: v });
      if (!r.ok) { alert(r.erro?.mensagem || 'erro'); return; }
      carregar();
    }
  }
"""
patch(proj_path, proj_marker, proj_add)
patch(proj_path, proj_handler_marker, proj_handler_add)
