#!/usr/bin/env python3
"""
Atualiza as telas pra usar o helper _chrome.js (topbar + menuLateral).
Substitui a topbar hardcoded por ${topbar()} e remove a funcao menuLateral local.
"""
import os
import re

TELAS_DIR = r'E:\Projetos\LOPES FOCUS\src\js\telas'
CHROME_IMPORT = "import { topbar, menuLateral } from './_chrome.js';"
TOPBAR_HTML = """    ${topbar()}
    <div class="main">
      <aside class="sidebar">${menuLateral('%s')}</aside>"""
TOPBAR_PATTERN = re.compile(
    r"""    <div class="topbar">\n      <span class="brand">.*?</span>\n      <span class="brand-sub".*?</span>\n      <span class="spacer"></span>\n      <span class="status".*?</span>\n    </div>\n    <div class="main">\n      <aside class="sidebar">\$\{menuLateral\('(\w+)'\)\}</aside>""",
    re.DOTALL,
)
MENU_PATTERN = re.compile(
    r"function menuLateral\(ativa\)\s*\{[\s\S]*?^\}",
    re.MULTILINE,
)

telas = ['areas.js', 'busca.js', 'clientes.js', 'configuracoes.js', 'inbox.js', 'projetos.js', 'tarefas.js']
for fn in telas:
    path = os.path.join(TELAS_DIR, fn)
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    m = TOPBAR_PATTERN.search(text)
    if not m:
        print(f'  [skip] {fn} - nao achei topbar pattern')
        continue
    ativa = m.group(1)
    new_topbar = TOPBAR_HTML % ativa
    text = TOPBAR_PATTERN.sub(new_topbar, text)
    # Remove a funcao local menuLateral
    text = MENU_PATTERN.sub("// (menuLateral movido pra _chrome.js)\nfunction menuLateral(ativa) { return ''; }", text)
    # Adiciona o import (depois do primeiro import)
    if CHROME_IMPORT not in text:
        text = re.sub(r"(import .*?;\n)", r"\1" + CHROME_IMPORT + "\n", text, count=1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'  [ok] {fn} (rota={ativa})')
