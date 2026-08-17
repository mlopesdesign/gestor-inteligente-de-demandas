#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Copia o neutralino.config.json pro dist (era o motivo do neutralinojs.org aparecer)"""
import os

path = r'E:\Projetos\LOPES FOCUS\tools\build.mjs'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Adiciona DEPOIS do copyFileSync do src/
old = """// FIX v0.2.19: copia o src/ inteiro pra app-image (era o motivo do "abre neutralino"
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

new = """// FIX v0.2.19: copia o src/ inteiro pra app-image (era o motivo do "abre neutralino"
// no PC do usuario — o documentRoot: '/' + url: '/src/index.html' aponta pro disco,
// e sem src/ no Program Files o app nao tem onde carregar o HTML/CSS/JS)
import { cpSync } from 'node:fs';
const srcDir = join(src);
const dstSrc = join(appImageDst, 'src');
console.log(`[build] copiando src/ pra ${dstSrc}...`);
if (existsSync(dstSrc)) rmSync(dstSrc, { recursive: true, force: true });
cpSync(srcDir, dstSrc, { recursive: true });
console.log(`[build] OK src/ copiado`);

// FIX v0.2.20: copia o neutralino.config.json pro app-image
// (sem isso o .exe nao acha o config e cai na pagina default do neutralinojs.org)
const cfgSrc = join(root, 'neutralino.config.json');
const cfgDst = join(appImageDst, 'neutralino.config.json');
if (existsSync(cfgSrc)) {
  copyFileSync(cfgSrc, cfgDst);
  console.log(`[build] OK neutralino.config.json copiado`);
}

console.log(`[build] OK app-image em ${appImageDst}`);"""

if old in content:
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: build.mjs atualizado')
else:
    print('NAO ACHOU - dump do arquivo:')
    # Tentar achar o trecho
    for marker in ['cpSync(srcDir', 'appImageDst', 'console.log(`[build] OK app-image']:
        idx = content.find(marker)
        if idx >= 0:
            print(f'  {marker} encontrado em {idx}')
