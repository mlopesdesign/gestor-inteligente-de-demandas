#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Força app a pensar que está em 0.2.15 (pra teste)"""
cfg_path = r'C:\Program Files\Gestor Inteligente de Demandas\neutralino.config.json'
data = open(cfg_path, 'r', encoding='utf-8').read()
data = data.replace('"version": "0.2.10"', '"version": "0.2.15"')
open(cfg_path, 'w', encoding='utf-8').write(data)
print('config -> 0.2.15')

idx_path = r'C:\Program Files\Gestor Inteligente de Demandas\src\index.html'
data = open(idx_path, 'r', encoding='utf-8').read()
data = data.replace('content="0.2.17"', 'content="0.2.15"', 1)
open(idx_path, 'w', encoding='utf-8').write(data)
print('index.html -> 0.2.15')
