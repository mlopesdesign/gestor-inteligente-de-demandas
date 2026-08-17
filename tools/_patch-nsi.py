#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Atualiza APP_VERSION no gestor.nsi"""
import re
import sys

path = r'E:\Projetos\LOPES FOCUS\installer\gestor.nsi'
pkg = open(r'E:\Projetos\LOPES FOCUS\package.json', 'r', encoding='utf-8').read()
m = re.search(r'"version":\s*"(\d+\.\d+\.\d+)"', pkg)
nova_versao = m.group(1) if m else None
if not nova_versao:
    print('versão não encontrada no package.json', file=sys.stderr)
    sys.exit(1)

with open(path, 'rb') as f:
    data = f.read()

# Regex binary
pattern = re.compile(rb'(!define APP_VERSION ")\d+\.\d+\.\d+(")')
new_pattern = br'\g<1>' + nova_versao.encode('ascii') + br'\g<2>'
data2 = pattern.sub(new_pattern, data)

with open(path, 'wb') as f:
    f.write(data2)

print('OK: gestor.nsi atualizado para', nova_versao)
