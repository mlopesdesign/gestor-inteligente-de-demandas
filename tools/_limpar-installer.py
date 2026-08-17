#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Apaga versoes antigas do installer/ (mantem as 3 mais recentes)"""
import os
import re

keep = {'0.2.19', '0.2.20', '0.2.21'}  # v0.2.22 ainda nao foi buildada
installer_dir = r'E:\Projetos\LOPES FOCUS\installer'

# Apagar Setup.exe antigos
removed = 0
for fn in os.listdir(installer_dir):
    m = re.match(r'GestorInteligenteDeDemandas-Setup-(\d+\.\d+\.\d+)\.exe$', fn)
    if m and m.group(1) not in keep:
        path = os.path.join(installer_dir, fn)
        os.remove(path)
        print('removido:', fn)
        removed += 1
print(f'Setup.exe removidos: {removed}')

# Apagar RELEASE-NOTES antigos
removed = 0
for fn in os.listdir(installer_dir):
    m = re.match(r'RELEASE-NOTES-v(\d+\.\d+\.\d+)', fn)
    if m and m.group(1) not in keep:
        path = os.path.join(installer_dir, fn)
        os.remove(path)
        print('removido:', fn)
        removed += 1
print(f'RELEASE-NOTES removidos: {removed}')

# Listar o que sobrou
print()
print('Restantes:')
for fn in sorted(os.listdir(installer_dir)):
    if fn.startswith('GestorInteligenteDeDemandas-Setup-') or fn.startswith('RELEASE-NOTES-'):
        print(' ', fn)
