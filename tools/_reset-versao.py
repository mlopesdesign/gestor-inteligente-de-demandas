#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Restaura o app instalado pra versão do package.json"""
import re
import os

pkg = open(r'E:\Projetos\LOPES FOCUS\package.json', 'r', encoding='utf-8').read()
m = re.search(r'"version":\s*"(\d+\.\d+\.\d+)"', pkg)
versao = m.group(1) if m else '0.0.0'

cfg_path = r'C:\Program Files\Gestor Inteligente de Demandas\neutralino.config.json'
data = open(cfg_path, 'r', encoding='utf-8').read()
data = re.sub(r'"version":\s*"\d+\.\d+\.\d+"', f'"version": "{versao}"', data)
open(cfg_path, 'w', encoding='utf-8').write(data)
print('config ->', versao)

idx_path = r'C:\Program Files\Gestor Inteligente de Demandas\src\index.html'
data = open(idx_path, 'r', encoding='utf-8').read()
data = re.sub(r'content="0\.2\.\d+"', f'content="{versao}"', data)
open(idx_path, 'w', encoding='utf-8').write(data)
print('index.html ->', versao)
