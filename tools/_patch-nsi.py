#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Atualiza APP_VERSION no gestor.nsi (binario)"""
import sys
path = r'E:\Projetos\LOPES FOCUS\installer\gestor.nsi'
nova_versao = '0.2.17'

with open(path, 'rb') as f:
    data = f.read()

# Substitui !define APP_VERSION "X.Y.Z" (ASCII puro)
old = b'!define APP_VERSION "0.2.16"'
new = b'!define APP_VERSION "' + nova_versao.encode('ascii') + b'"'
if old not in data:
    print('Versão 0.2.16 não encontrada no NSI', file=sys.stderr)
    sys.exit(1)
data = data.replace(old, new)

with open(path, 'wb') as f:
    f.write(data)

print('OK: gestor.nsi atualizado para', nova_versao)
