#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Remove verificarUpdate e aplicarUpdate do ambiente.js"""
import sys

path = r'E:\Projetos\LOPES FOCUS\src\js\backend\ambiente.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Bloco a ser removido: do "Atualização online" até o final do arquivo (que termina em aplicarUpdate)
start_marker = '// ---------------------------------------------------------------------------\n// Atualização online'
end_marker = 'export async function aplicarUpdate'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)
if start_idx < 0 or end_idx < 0:
    print('Marcadores não encontrados', file=sys.stderr)
    sys.exit(1)

# Remove tudo desde start_marker até o final (depois de end_idx vai ter a função aplicarUpdate
# e mais nada - é o último bloco do arquivo)
# Mantém uma nota curta no lugar
nova_nota = '''// ---------------------------------------------------------------------------
// Atualização online (PADRAO §5)
// FIX v0.2.17: REMOVIDAS as funções verificarUpdate() e aplicarUpdate() deste módulo.
// Elas chamavam Neutralino.updater.checkForUpdates() e applyUpdate() que ABRIAM o
// navegador do usuário (Edge) com a URL do manifest do Neutralino. A v0.2.16 só
// removeu do app.js, esqueceu daqui. O fluxo oficial de update é:
//   app.js:verificarAtualizacao()   -> fetch(update.json), sem abrir navegador
//   app.js:aplicarAtualizacao()     -> Neutralino.os.execCommand(powershell)
// ---------------------------------------------------------------------------
'''

novo_conteudo = content[:start_idx] + nova_nota

with open(path, 'w', encoding='utf-8') as f:
    f.write(novo_conteudo)

print('OK: ambiente.js limpo.')
print(f'Tamanho antes: {len(content)} bytes')
print(f'Tamanho depois: {len(novo_conteudo)} bytes')
