#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Adiciona rotas *:excluir no servidor (tarefas, clientes, projetos)"""
import os

path = r'E:\Projetos\LOPES FOCUS\src\js\backend\servidor.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Substituir as 3 secoes pra incluir excluir
# 1. tarefas
old1 = "        case 'tarefas:arquivar':           return tarefasCore.arquivar(db, payload, s);"
new1 = """        case 'tarefas:arquivar':           return tarefasCore.arquivar(db, payload, s);
        case 'tarefas:excluir':            return tarefasCore.excluir(db, payload, s);"""
content = content.replace(old1, new1)

# 2. clientes
old2 = "        case 'clientes:arquivar':    return clientesCore.arquivar(db, payload, s);"
new2 = """        case 'clientes:arquivar':    return clientesCore.arquivar(db, payload, s);
        case 'clientes:excluir':     return clientesCore.excluir(db, payload, s);"""
content = content.replace(old2, new2)

# 3. projetos
old3 = "        case 'projetos:concluir':    return projetosCore.concluir(db, payload, s);"
new3 = """        case 'projetos:concluir':    return projetosCore.concluir(db, payload, s);
        case 'projetos:excluir':     return projetosCore.excluir(db, payload, s);"""
content = content.replace(old3, new3)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

# Verificar
n = content.count(':excluir')
print('total :excluir no servidor:', n)
