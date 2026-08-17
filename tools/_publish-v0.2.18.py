#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Publica v0.2.18: botoes Excluir em tarefas/clientes/projetos"""
import os
import shutil
import subprocess
import hashlib

nova_versao = '0.2.18'
novo_sha = hashlib.sha256(open(r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.18.exe', 'rb').read()).hexdigest().upper()
novo_size = os.path.getsize(r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.18.exe')
novo_neu_sha = hashlib.sha256(open(r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu', 'rb').read()).hexdigest().upper()

novas_notas = 'v0.2.18 - Botoes de Excluir em Tarefas, Clientes e Projetos. Antes so Areas tinha. Agora todas as 4 entidades tem: Editar + Acao principal (Concluir/Arquivar) + Excluir (vermelho, com confirmacao). Projetos tambem ganhou botao Concluir. Bloqueia exclusao se ha entidades vinculadas (tarefa->cliente/projeto, projeto->tarefas, area->tarefas) com mensagem clara pedindo reatribuicao.'

novo_json = '''{
  "applicationId": "app.mllopes.gestor",
  "version": "''' + nova_versao + '''",
  "notes": "''' + novas_notas + '''",
  "resourcesURL": "https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/download/v''' + nova_versao + '''/resources.neu",
  "sha256": "''' + novo_sha + '''",
  "size": ''' + str(novo_size) + '''
}
'''

# 1. update.json raiz
root_json = r'E:\Projetos\LOPES FOCUS\update.json'
with open(root_json, 'w', encoding='utf-8') as f:
    f.write(novo_json)
print('OK: update.json (raiz)')

# 2. gh-pages
gh_dir = r'C:\Users\mlope\Documents\GitHub\gestor-inteligente-de-demandas'
if os.path.exists(gh_dir):
    shutil.copy2(root_json, os.path.join(gh_dir, 'update.json'))
    os.chdir(gh_dir)
    subprocess.run(['git', 'add', 'update.json'], check=True)
    subprocess.run(['git', '-c', 'user.email=marcio@gestor.local', '-c', 'user.name=Marcio Lopes', 'commit', '-m', 'update.json v0.2.18'], capture_output=True, text=True)
    res = subprocess.run(['git', 'push', 'origin', 'gh-pages'], capture_output=True, text=True)
    print('gh-pages push:', 'OK' if res.returncode == 0 else res.stderr)

# 3. Release notes
with open(r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.18.md', 'w', encoding='utf-8') as f:
    f.write('''# v0.2.18 - Botoes de Excluir em todas as entidades

## O que mudou

| Entidade | Antes | Agora |
|---|---|---|
| **Tarefas** | Editar + Concluir | Editar + Concluir + **Excluir** |
| **Clientes** | Editar + Arquivar | Editar + Arquivar + **Excluir** |
| **Projetos** | so Editar | Editar + Concluir + **Excluir** |
| **Areas** | Editar + Excluir | (sem mudanca) |

## Comportamento

- Clique em **Excluir** dispara confirmacao JavaScript (`confirm()`)
- Se houver entidades vinculadas (cliente com tarefas/projetos, projeto com tarefas, area com tarefas), o backend retorna `EM_USO` e o app mostra mensagem clara pedindo reatribuicao
- Apos excluir, a lista recarrega automaticamente
- Auditoria grava `excluida`/`excluido` com ID

## Motivacao

Pedido direto: "qualquer coisa tem que ter a opcao de exclusao, se erro vou olhar pro erro o resto da vida?" — agora da pra limpar entidades que foram criadas por engano.

## Instalacao

Baixe `GestorInteligenteDeDemandas-Setup-0.2.18.exe` (5.36 MB).
SHA-256: `''' + novo_sha + '''`

## Proxima

- Auto-update comecou a checar v0.2.18 (gh-pages ja publicado)
- Toast "Nova versao disponivel" deve aparecer no app que ainda estiver na v0.2.17
''')

with open(r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.18-GH.md', 'w', encoding='utf-8') as f:
    f.write('''# v0.2.18 - Botoes de Excluir

**Tarefas, Clientes, Projetos** ganharam botao **Excluir** (Areas ja tinha).

| Entidade | Botoes |
|---|---|
| Tarefas | Editar + Concluir + **Excluir** |
| Clientes | Editar + Arquivar + **Excluir** |
| Projetos | Editar + Concluir + **Excluir** |

Excluir dispara `confirm()` antes de chamar o backend. Bloqueia com `EM_USO` se houver vinculos (cliente com tarefas/projetos, projeto com tarefas, area com tarefas) e pede reatribuicao.

**Instalacao:** `GestorInteligenteDeDemandas-Setup-0.2.18.exe` (5.36 MB).
SHA-256: `''' + novo_sha + '''`
''')

# 4. Commit + tag + push + release
os.chdir(r'E:\Projetos\LOPES FOCUS')
subprocess.run(['git', 'add', '-A'], capture_output=True, text=True)
res = subprocess.run(['git', '-c', 'user.email=marcio@gestor.local', '-c', 'user.name=Marcio Lopes', 'commit', '-m', 'v0.2.18: botoes Excluir em tarefas/clientes/projetos + Concluir em projetos'], capture_output=True, text=True)
print('commit:', res.stdout.strip() or 'ja commitado')
res = subprocess.run(['git', 'tag', '-f', 'v0.2.18'], capture_output=True, text=True)
res = subprocess.run(['git', 'push', 'origin', 'main', '--tags'], capture_output=True, text=True)
print('push:', 'OK' if res.returncode == 0 else res.stderr)

# 5. gh release create
notes = open(r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.18-GH.md', 'r', encoding='utf-8').read()
res = subprocess.run(['gh', 'release', 'create', 'v0.2.18', '--title', 'v0.2.18 - Botoes de Excluir em todas entidades', '--notes-file', r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.18-GH.md',
                       r'E:\Projetos\LOPES FOCUS\installer\GestorInteligenteDeDemandas-Setup-0.2.18.exe',
                       r'E:\Projetos\LOPES FOCUS\installer\instalar-windows.bat',
                       r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu',
                       r'E:\Projetos\LOPES FOCUS\installer\RELEASE-NOTES-v0.2.18.md'],
                      capture_output=True, text=True)
print('gh release:', res.stdout.strip() or res.stderr.strip())

# 6. Final
print()
print('=== Setup.exe v0.2.18 ===')
print('SHA-256:', novo_sha)
print('Size:', novo_size, 'bytes')
print('resources.neu SHA-256:', novo_neu_sha)
