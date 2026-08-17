#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Adiciona copia do src/ pro dist/GestorInteligenteDeDemandas no build.mjs"""
import os

path = r'E:\Projetos\LOPES FOCUS\tools\build.mjs'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Adiciona logo apos o copyFileSync do resources.neu
old = """copyFileSync(srcNeu, join(appImageDst, 'resources.neu'));

console.log(`[build] OK app-image em ${appImageDst}`);"""

new = """copyFileSync(srcNeu, join(appImageDst, 'resources.neu'));

// FIX v0.2.19: copia o src/ inteiro pra app-image (era o motivo do "abre neutralino"
// no PC do usuario — o documentRoot: '/' + url: '/src/index.html' aponta pro disco,
// e sem src/ no Program Files o app nao tem onde carregar o HTML/CSS/JS)
import { cpSync } from 'node:fs';
const srcDir = join(src);
const dstSrc = join(appImageDst, 'src');
console.log(`[build] copiando src/ pra ${dstSrc}...`);
if (existsSync(dstSrc)) rmSync(dstSrc, { recursive: true, force: true });
cpSync(srcDir, dstSrc, { recursive: true });
console.log(`[build] OK src/ copiado`);

console.log(`[build] OK app-image em ${appImageDst}`);"""

if old in content:
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: build.mjs atualizado')
else:
    print('NAO ACHOU')
