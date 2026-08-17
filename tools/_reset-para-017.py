#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Restaura o app instalado pra 0.2.17 final (sem forçar versão antiga)"""
import re

cfg_path = r'C:\Program Files\Gestor Inteligente de Demandas\neutralino.config.json'
data = open(cfg_path, 'r', encoding='utf-8').read()
data = data.replace('"version": "0.2.15"', '"version": "0.2.17"')
open(cfg_path, 'w', encoding='utf-8').write(data)
print('config -> 0.2.17')

idx_path = r'C:\Program Files\Gestor Inteligente de Demandas\src\index.html'
data = open(idx_path, 'r', encoding='utf-8').read()
data = re.sub(r'content="0\.2\.\d+"', 'content="0.2.17"', data)
open(idx_path, 'w', encoding='utf-8').write(data)
print('index.html -> 0.2.17')
