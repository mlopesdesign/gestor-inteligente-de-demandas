#!/usr/bin/env python3
"""Instala v0.2.47 em C:\Program Files\Gestor Inteligente de Demandas (a oficial NSIS)."""
import shutil
import os
import hashlib

dst = r'C:\Program Files\Gestor Inteligente de Demandas'
src = r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas'

# Fecha o app primeiro
import subprocess
subprocess.run(['powershell', '-Command', "Get-Process -Name 'GestorInteligenteDeDemandas' -ErrorAction SilentlyContinue | Stop-Process -Force"], check=False)
import time
time.sleep(2)

for fn in ['resources.neu', 'GestorInteligenteDeDemandas.exe', 'neutralino.config.json']:
    shutil.copy(os.path.join(src, fn), os.path.join(dst, fn))
    print('copied', fn)

src_dst = os.path.join(dst, 'src')
if os.path.exists(src_dst): shutil.rmtree(src_dst)
shutil.copytree(os.path.join(src, 'src'), src_dst)
print('copied src/')

with open(os.path.join(dst, 'resources.neu'), 'rb') as f:
    print('SHA:', hashlib.sha256(f.read()).hexdigest())

# Confirma config
with open(os.path.join(dst, 'neutralino.config.json'), 'r') as f:
    print('config version:', f.read()[:200])
