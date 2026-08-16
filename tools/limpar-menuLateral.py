#!/usr/bin/env python3
"""Remove a declaracao local de menuLateral das telas (ja vem do _chrome.js)."""
import os, re

TELAS_DIR = r'E:\Projetos\LOPES FOCUS\src\js\telas'
# Cobre:
#   function menuLateral(ativa) { (movido pra _chrome.js) return ''; }
#   function menuLateral(ativa) { /* antigo */ ... }
# ate o }; correspondente. Usa DOTALL.
PATTERN = re.compile(
    r"\n\s*//\s*\(menuLateral movido.*?\n\s*function menuLateral\(ativa\)\s*\{[^}]*\}\s*",
    re.MULTILINE,
)
# Versao mais geral: tudo entre 'function menuLateral' e o '}' final (com chaves balanceadas)
def remove_menu_lateral_func(text):
    # Procura "function menuLateral" ate o "}\n" ou "}\r\n" que fecha (sem chaves internas, ja que todas as substituicoes sao simples)
    pattern = re.compile(
        r"\n\s*(?://[^\n]*\n\s*)?function menuLateral\(ativa\)\s*\{[^}]*\}\s*",
        re.MULTILINE,
    )
    return pattern.sub('\n', text)

telas = ['hoje.js', 'areas.js', 'busca.js', 'clientes.js', 'configuracoes.js', 'inbox.js', 'projetos.js', 'tarefas.js']
for fn in telas:
    path = os.path.join(TELAS_DIR, fn)
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    new_text = remove_menu_lateral_func(text)
    if new_text != text:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_text)
        print(f'  [ok] {fn} - funcao local removida')
    else:
        print(f'  [skip] {fn} - nada pra remover')
