#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Corrige o IconFilename no .iss pra apontar pro icon.ico"""
import sys
path = r'E:\Projetos\LOPES FOCUS\installer\gestor.iss'
with open(path, 'r', encoding='utf-8') as f:
    s = f.read()
# Substitui IconFilename: {app}\GestorInteligenteDeDemandas.exe por {app}\icon.ico
old_marker = 'IconFilename: "' + '{app}\\{AppExeName}'
# Vou usar uma string segura
s2 = s.replace('IconFilename: "{app}\\{#AppExeName}"', 'IconFilename: "{app}\\icon.ico"')
if s == s2:
    print('NAO MUDOU')
else:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(s2)
    print('OK: IconFilename -> icon.ico em todas as linhas')
    # Conta ocorrencias
    count = s2.count('IconFilename: "{app}\\icon.ico"')
    print('Total IconFilename com icon.ico:', count)
