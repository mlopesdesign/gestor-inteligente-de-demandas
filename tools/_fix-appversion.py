#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Forca o AppVersion do .iss pra versao do package.json"""
import re

path = r'E:\Projetos\LOPES FOCUS\installer\gestor.iss'
pkg = open(r'E:\Projetos\LOPES FOCUS\package.json', 'r', encoding='utf-8').read()
m = re.search(r'"version":\s*"(\d+\.\d+\.\d+)"', pkg)
versao = m.group(1) if m else None
print('package.json versao:', versao)

# Tenta com regex binary
data = open(path, 'rb').read()
# Padrao: #define AppVersion "0.2.19"  (sem underscore, eh o .iss)
pattern = re.compile(rb'(#define AppVersion ")\d+\.\d+\.\d+(")')
new_data = pattern.sub(rb'\g<1>' + versao.encode('ascii') + rb'\g<2>', data)
if data == new_data:
    print('NAO MUDOU')
else:
    open(path, 'wb').write(new_data)
    print('OK: AppVersion ->', versao)
