#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Atualiza meta app-version e app-build no index.html"""
import re
import sys

path = r'E:\Projetos\LOPES FOCUS\src\index.html'
nova_versao = '0.2.17'
novo_build = '0.2.17-2026-08-17'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'(<meta name="app-version" content=")\d+\.\d+\.\d+(">)', r'\g<1>' + nova_versao + r'\g<2>', content)
content = re.sub(r'(<meta name="app-build" content=")\d+\.\d+\.\d+-\d{4}-\d{2}-\d{2}(">)', r'\g<1>' + novo_build + r'\g<2>', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('OK: index.html atualizado.')
print('  app-version =', nova_versao)
print('  app-build   =', novo_build)
