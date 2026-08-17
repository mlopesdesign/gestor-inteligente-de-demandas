#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Corrige sintaxe quebrada do hoje.js (handler excluir mal inserido)"""
import re

path = r'E:\Projetos\LOPES FOCUS\src\js\telas\hoje.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern flexível: aceita 1 ou 2 espaços de indentação
old = re.compile(
    r"else if \(ac === 'editar'\) \{\s*"
    r"\s*else if \(ac === 'excluir'\) \{\s*"
    r".*?'tarefas:excluir'.*?\n"
    r"(\s*)\}\s*\n"
    r"\n"
    r"(\s*)const t = _cacheTarefas.*?"
    r"\n(\s*)\}",
    re.DOTALL
)

new = """else if (ac === 'excluir') {
    if (confirm('Excluir esta tarefa? Esta ação não pode ser desfeita.')) {
      const r = await window.api('tarefas:excluir', { id, versao: v });
      if (!r.ok) { alert(r.erro?.mensagem || 'erro'); return; }
      carregar();
    }
  }
  else if (ac === 'editar') {
    const t = _cacheTarefas.find(x => x.id === id);
    const m = await import('./tarefas.js');
    const full = (await window.api('tarefas:obter', { id })).dados;
    m.modalTarefa(full, await getCache(), carregar);
  }"""

m = old.search(content)
if m:
    new_content = old.sub(new, content, count=1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('OK: hoje.js corrigido')
else:
    print('NAO ACHOU')
    # debug
    for mm in re.finditer(r'else if \(ac ===', content):
        idx = mm.start()
        print(repr(content[max(0,idx-10):idx+200]))
        print('---')
