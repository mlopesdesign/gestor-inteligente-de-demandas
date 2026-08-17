#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Atualiza gh-pages com o update.json novo"""
import os
import shutil
import subprocess

gh_dir = r'C:\Users\mlope\Documents\GitHub\gestor-inteligente-de-demandas'
if not os.path.exists(gh_dir):
    print('gh-pages dir nao existe em', gh_dir)
    print('Tentando clonar...')
    parent = os.path.dirname(gh_dir)
    if not os.path.exists(parent):
        os.makedirs(parent)
    subprocess.run(['git', 'clone', '-b', 'gh-pages', 'https://github.com/mlopesdesign/gestor-inteligente-de-demandas.git', gh_dir], check=True)

# Copia o update.json novo
src = r'E:\Projetos\LOPES FOCUS\update.json'
dst = os.path.join(gh_dir, 'update.json')
if not os.path.exists(src):
    print('update.json origem nao existe:', src)
    raise SystemExit(1)
shutil.copy2(src, dst)
print('OK: update.json copiado para', dst)
print('Conteudo:')
print(open(dst, 'r', encoding='utf-8').read())

# Git add/commit/push
os.chdir(gh_dir)
subprocess.run(['git', 'add', 'update.json'], check=True)
res = subprocess.run(['git', '-c', 'user.email=marcio@gestor.local', '-c', 'user.name=Marcio Lopes', 'commit', '-m', 'update.json v0.2.17'], capture_output=True, text=True)
print('git commit:', res.stdout)
if res.returncode != 0:
    print('git commit stderr:', res.stderr)
res = subprocess.run(['git', 'push', 'origin', 'gh-pages'], capture_output=True, text=True)
print('git push:', res.stdout)
if res.returncode != 0:
    print('git push stderr:', res.stderr)
