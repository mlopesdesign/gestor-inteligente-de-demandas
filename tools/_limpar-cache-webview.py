#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Limpa cache do WebView2 e inicia o app pra teste de update"""
import os
import shutil
import subprocess
import time

# Limpa cache WebView2
cache_dirs = [
    r'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas.exe\EBWebView\Default\Cache',
    r'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas.exe\EBWebView\Default\Code Cache',
    r'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas.exe\EBWebView\Default\Service Worker',
    r'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas.exe\EBWebView\Default\Session Storage',
    r'C:\Users\mlope\AppData\Roaming\GestorInteligenteDeDemandas.exe\EBWebView\Default\Local Storage',
]
for d in cache_dirs:
    if os.path.exists(d):
        try:
            shutil.rmtree(d)
            print('cleaned', d)
        except Exception as e:
            print('FAIL', d, ':', e)
    else:
        print('skip (not found)', d)

# Backup do resources.neu atual (pra restaurar depois se teste passar)
import shutil
src_neu = r'C:\Program Files\Gestor Inteligente de Demandas\resources.neu'
bak_neu = r'E:\Projetos\LOPES FOCUS\test-neu-backup.neu'
if os.path.exists(src_neu) and not os.path.exists(bak_neu):
    shutil.copy2(src_neu, bak_neu)
    print('backup do resources.neu em', bak_neu)
elif os.path.exists(bak_neu):
    print('backup ja existe em', bak_neu)
