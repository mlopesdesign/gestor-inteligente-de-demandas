#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Remove auto-click de teste do app.js"""
import os

path = r'E:\Projetos\LOPES FOCUS\src\js\app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove v2
old_v2 = '''    // === TESTE AUTOMÁTICO v2: chama aplicarAtualizacao(info) direto ===
    setTimeout(async () => {
      try {
        D('[teste] chamando aplicarAtualizacao direto com ' + info.version);
        mostrarAvisoAtualizacao(info);
        await aplicarAtualizacao(info);
        D('[teste] aplicarAtualizacao retornou');
      } catch (e) { D('[teste] erro: ' + e.message); }
    }, 5000);

'''

if old_v2 in content:
    content = content.replace(old_v2, '')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: auto-click v2 removido')
else:
    print('v2 nao encontrado, tentando v1...')
    old_v1 = '''    // === TESTE AUTOMÁTICO: simula click em "Atualizar agora" 5s depois ===
    setTimeout(() => {
      try {
        const btn = document.querySelector('.toast.atualizacao .btn-atualizar');
        if (btn) {
          D('[teste] auto-click em Atualizar agora');
          btn.click();
        } else {
          D('[teste] btn-atualizar nao encontrado');
        }
      } catch (e) { D('[teste] erro no auto-click: ' + e.message); }
    }, 5000);

'''
    if old_v1 in content:
        content = content.replace(old_v1, '')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('OK: auto-click v1 removido')
    else:
        print('Nenhum auto-click encontrado (já limpo?)')
