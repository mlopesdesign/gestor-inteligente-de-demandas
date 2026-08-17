#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Adiciona permissoes para *:excluir"""
import os

path = r'E:\Projetos\LOPES FOCUS\src\js\backend\permissoes.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_t = "  'tarefas:arquivar':     'TAREFAS',"
new_t = """  'tarefas:arquivar':     'TAREFAS',
  'tarefas:excluir':      'TAREFAS',"""
content = content.replace(old_t, new_t)

old_c = "  'clientes:arquivar':    'CLIENTES',"
new_c = """  'clientes:arquivar':    'CLIENTES',
  'clientes:excluir':     'CLIENTES',"""
content = content.replace(old_c, new_c)

old_p = "  'projetos:concluir':    'PROJETOS',"
new_p = """  'projetos:concluir':    'PROJETOS',
  'projetos:excluir':     'PROJETOS',"""
content = content.replace(old_p, new_p)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('OK permissoes atualizadas')
