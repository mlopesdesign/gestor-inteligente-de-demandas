#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Sincroniza app instalado em C:\\Program Files com a versão local
   - sobrescreve arquivo por arquivo (sem deletar src/)"""
import os
import shutil
import sys

src_root = r'E:\Projetos\LOPES FOCUS\src'
dst_app = r'C:\Program Files\Gestor Inteligente de Demandas'
dist = r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas'

# 1. Copia src/ com overwrite arquivo por arquivo (shutil.copytree com dirs_exist_ok)
print('[sync] 1/3 copiando src/ (overwrite)...')
dst_src = os.path.join(dst_app, 'src')
# Tenta remover src/ primeiro; se falhar, sobrescreve
try:
    shutil.rmtree(dst_src)
    print('       src/ antigo removido')
except Exception as e:
    print(f'       WARN: não consegui remover src/ antigo ({e}), sobrescrevendo arquivo por arquivo')
    # sobrescreve
    for root, dirs, files in os.walk(src_root):
        rel = os.path.relpath(root, src_root)
        dst_dir = os.path.join(dst_src, rel) if rel != '.' else dst_src
        if not os.path.exists(dst_dir):
            try:
                os.makedirs(dst_dir)
            except Exception as e2:
                print(f'       FAIL mkdir {dst_dir}: {e2}')
                continue
        for f in files:
            s = os.path.join(root, f)
            d = os.path.join(dst_dir, f)
            try:
                shutil.copy2(s, d)
            except Exception as e3:
                print(f'       FAIL copy {f}: {e3}')
    # Cria diretórios novos que não existiam
    for root, dirs, files in os.walk(src_root):
        rel = os.path.relpath(root, src_root)
        if rel == '.':
            continue
        dst_dir = os.path.join(dst_src, rel)
        if not os.path.exists(dst_dir):
            try:
                os.makedirs(dst_dir)
            except Exception as e4:
                print(f'       FAIL mkdir {dst_dir}: {e4}')
else:
    shutil.copytree(src_root, dst_src, dirs_exist_ok=False)
    print('       OK src/ copiado (limpo)')

# 2. Copia resources.neu novo
print('[sync] 2/3 copiando resources.neu...')
src_neu = os.path.join(dist, 'resources.neu')
dst_neu = os.path.join(dst_app, 'resources.neu')
if os.path.exists(dst_neu):
    try:
        os.remove(dst_neu)
    except Exception as e:
        print(f'       FAIL remove {dst_neu}: {e}')
shutil.copy2(src_neu, dst_neu)
print(f'       OK {os.path.getsize(dst_neu)} bytes')

# 3. Copia GestorInteligenteDeDemandas.exe novo
print('[sync] 3/3 copiando .exe...')
src_exe = os.path.join(dist, 'GestorInteligenteDeDemandas.exe')
dst_exe = os.path.join(dst_app, 'GestorInteligenteDeDemandas.exe')
if os.path.exists(dst_exe):
    try:
        os.remove(dst_exe)
    except Exception as e:
        print(f'       FAIL remove {dst_exe}: {e}')
shutil.copy2(src_exe, dst_exe)
print(f'       OK {os.path.getsize(dst_exe)} bytes')

# 4. Verifica
print('[sync] Verificando versão no Program Files...')
import json, re
cfg_path = os.path.join(dst_app, 'neutralino.config.json')
if os.path.exists(cfg_path):
    cfg = json.load(open(cfg_path, 'r', encoding='utf-8'))
    print(f'       neutralino.config.json version = {cfg.get("version", "?")}')

idx_path = os.path.join(dst_app, 'src', 'index.html')
if os.path.exists(idx_path):
    idx = open(idx_path, 'r', encoding='utf-8').read()
    m = re.search(r'<meta name="app-version" content="([^"]+)"', idx)
    if m:
        print(f'       index.html app-version = {m.group(1)}')

# Verifica que app.js NÃO tem mais checkForUpdates em produção
aj = os.path.join(dst_app, 'src', 'js', 'app.js')
if os.path.exists(aj):
    s = open(aj, 'r', encoding='utf-8').read()
    if 'Neutralino.updater.checkForUpdates' in s:
        print('       !!! ALERTA: app.js AINDA TEM checkForUpdates !!!')
    else:
        print('       OK: app.js SEM checkForUpdates')
    if 'window.open(info.resourcesURL' in s:
        print('       !!! ALERTA: app.js AINDA TEM window.open !!!')
    else:
        print('       OK: app.js SEM window.open fallback')

am = os.path.join(dst_app, 'src', 'js', 'backend', 'ambiente.js')
if os.path.exists(am):
    s = open(am, 'r', encoding='utf-8').read()
    if 'Neutralino.updater.checkForUpdates' in s:
        print('       !!! ALERTA: ambiente.js AINDA TEM checkForUpdates !!!')
    else:
        print('       OK: ambiente.js SEM checkForUpdates')

print('[sync] OK')
