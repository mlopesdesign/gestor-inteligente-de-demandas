#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Injeta auto-click no app.js pra testar o flow de update via UI
   (apenas pra teste, vai ser revertido)"""
import os
import re

path = r'E:\Projetos\LOPES FOCUS\src\js\app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Encontra o setTimeout do auto-check e injeta um auto-click no botão
# "Atualizar agora" depois de 10s (se o toast aparecer)
marker = '''// Checar atualizacao 5s depois do boot (nao atrasar o carregamento)
setTimeout(async () => {
  const info = await verificarAtualizacao({ silencioso: true });
  if (info) {'''

inject = '''// Checar atualizacao 5s depois do boot (nao atrasar o carregamento)
setTimeout(async () => {
  const info = await verificarAtualizacao({ silencioso: true });
  if (info) {
    // === TESTE AUTOMÁTICO: simula click em "Atualizar agora" 5s depois ===
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

if marker in content and 'auto-click em' not in content:
    content = content.replace(marker, inject)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: auto-click injetado no app.js')
else:
    print('JÁ INJETADO ou marcador nao encontrado')
