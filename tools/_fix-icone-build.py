#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Adiciona copia do icon.ico pro dist (necessario pro Inno Setup)"""
import os

path = r'E:\Projetos\LOPES FOCUS\tools\build.mjs'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Adiciona apos o copyFileSync do neutralino.config.json
old = """// FIX v0.2.20: copia o neutralino.config.json pro app-image
// (sem isso o .exe nao acha o config e cai na pagina default do neutralinojs.org)
const cfgSrc = join(root, 'neutralino.config.json');
const cfgDst = join(appImageDst, 'neutralino.config.json');
if (existsSync(cfgSrc)) {
  copyFileSync(cfgSrc, cfgDst);
  console.log(`[build] OK neutralino.config.json copiado`);
}

console.log(`[build] OK app-image em ${appImageDst}`);"""

new = """// FIX v0.2.20: copia o neutralino.config.json pro app-image
// (sem isso o .exe nao acha o config e cai na pagina default do neutralinojs.org)
const cfgSrc = join(root, 'neutralino.config.json');
const cfgDst = join(appImageDst, 'neutralino.config.json');
if (existsSync(cfgSrc)) {
  copyFileSync(cfgSrc, cfgDst);
  console.log(`[build] OK neutralino.config.json copiado`);
}

// FIX v0.2.22: copia o icon.ico pro app-image
// (sem isso os atalhos do Menu Iniciar / Area de Trabalho ficam com icone default do Windows)
const iconSrc = join(root, 'installer', 'resources', 'icon.ico');
const iconDst = join(appImageDst, 'icon.ico');
if (existsSync(iconSrc)) {
  copyFileSync(iconSrc, iconDst);
  console.log(`[build] OK icon.ico copiado`);
}

console.log(`[build] OK app-image em ${appImageDst}`);"""

if old in content:
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: build.mjs atualizado (copia icon.ico)')
else:
    print('NAO ACHOU - dump do arquivo:')
    for marker in ['cfgSrc', 'cfgDst', 'icon.ico', 'appImageDst']:
        idx = content.find(marker)
        if idx >= 0:
            print(f'  {marker} encontrado em {idx}')

# Tambem ajustar o .iss pra apontar IconFilename pro icon.ico direto
path_iss = r'E:\Projetos\LOPES FOCUS\installer\gestor.iss'
with open(path_iss, 'r', encoding='utf-8') as f:
    content_iss = f.read()

old_iss = """[Icons]
Name: "{autoprograms}\\{#AppName}"; Filename: "{app}\\{#AppExeName}"; IconFilename: "{app}\\{#AppExeName}"
Name: "{autodesktop}\\{#AppName}"; Filename: "{app}\\{#AppExeName}"; IconFilename: "{app}\\{#AppExeName}"; Tasks: desktopicon
Name: "{group}\\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"; IconFilename: "{app}\\{#AppExeName}" """

new_iss = """[Icons]
; FIX v0.2.22: IconFilename aponta pro icon.ico (lampada MLOPES DEV)
; em vez de pro .exe (que tem icone generico do Neutralino)
Name: "{autoprograms}\\{#AppName}"; Filename: "{app}\\{#AppExeName}"; IconFilename: "{app}\\icon.ico"
Name: "{autodesktop}\\{#AppName}"; Filename: "{app}\\{#AppExeName}"; IconFilename: "{app}\\icon.ico"; Tasks: desktopicon
Name: "{group}\\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"; IconFilename: "{app}\\icon.ico" """

if old_iss in content_iss:
    content_iss = content_iss.replace(old_iss, new_iss)
    with open(path_iss, 'w', encoding='utf-8') as f:
        f.write(content_iss)
    print('OK: gestor.iss atualizado (IconFilename=icon.ico)')
else:
    print('NAO ACHOU bloco [Icons] - dump:')
    print(content_iss[content_iss.find('[Icons]'):content_iss.find('[Icons]')+400])
