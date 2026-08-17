#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Verifica as instalacoes do Gestor"""
import os, json
paths = [
    r'C:\Users\mlope\AppData\Local\Programs\Gestor Inteligente de Demandas',
    r'C:\Program Files\Gestor Inteligente de Demandas',
]
for p in paths:
    if os.path.exists(p):
        cfg = os.path.join(p, 'neutralino.config.json')
        ex = os.path.exists(cfg)
        if ex:
            c = json.load(open(cfg, 'r', encoding='utf-8'))
            ts = c.get('tokenSecurity')
            ei = c.get('exportAuthInfo')
            v = c.get('version')
            print(p)
            print('  config OK, tokenSecurity=' + str(ts) + ', exportAuthInfo=' + str(ei) + ', version=' + str(v))
        else:
            print(p + ': SEM CONFIG!')
        exe = os.path.join(p, 'GestorInteligenteDeDemandas.exe')
        if os.path.exists(exe):
            print('  exe: ' + str(os.path.getsize(exe)) + ' bytes')
        src = os.path.join(p, 'src')
        if os.path.exists(src):
            print('  src: ' + str(len(os.listdir(src))) + ' arquivos')
    else:
        print(p + ': NAO EXISTE')
    print()
