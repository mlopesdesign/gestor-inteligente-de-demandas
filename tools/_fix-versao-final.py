#!/usr/bin/env python3
"""Reverte 'versão' -> 'versao' em BACKEND apenas (SQL e variaveis)."""
import re
import sys
from pathlib import Path

# Em arquivos de backend, QUASE TUDO que diz 'versão' deveria ser 'versao'.
# Exceto: textos de UI (mensagens de erro, etc).
# Vou reverter quase tudo e ajustar manualmente se quebrar.

for arg in sys.argv[1:]:
    p = Path(arg)
    if p.is_dir():
        files = list(p.rglob('*.js'))
    else:
        files = [p]
    for f in files:
        if not f.is_file():
            continue
        try:
            text = f.read_text(encoding='utf-8')
        except Exception:
            continue
        original = text
        # Caso 1: nome de coluna/variável em SQL string
        text = text.replace("'versão=versão+1", "'versao=versao+1")
        text = text.replace("' AND versão = ?`", "' AND versao = ?`")
        text = text.replace("AND versão = ?`", "AND versao = ?`")
        text = text.replace("AND versão = ?", "AND versao = ?")
        text = text.replace("WHERE versão", "WHERE versao")
        text = text.replace("= versão + 1", "= versao + 1")
        text = text.replace("versão=versão+1", "versao=versao+1")
        # Caso 2: em destructure, versao || 0
        text = text.replace("versão || 0", "versao || 0")
        text = text.replace("versão || 1", "versao || 1")
        # Caso 3: SQL field list (ex: SELECT ..., versao, ...)
        text = text.replace(", versão,", ", versao,")
        text = text.replace("(versão,", "(versao,")
        text = text.replace(" versão,", " versao,")
        text = text.replace("(versão)", "(versao)")
        text = text.replace(" versão)", " versao)")
        # Caso 4: chave de objeto/JSON 'versão': -> 'versao':
        text = text.replace("'versão':", "'versao':")
        text = text.replace('"versão":', '"versao":')
        # Caso 5: string 'versão' em payload
        text = text.replace("'versão'", "'versao'")
        text = text.replace('"versão"', '"versao"')
        # Caso 6: nomes JS (variaveis, parametros, destructure)
        text = text.replace("versão ||", "versao ||")
        text = text.replace(", versão,", ", versao,")
        text = text.replace("{ versão,", "{ versao,")
        text = text.replace("{versão:", "{versao:")
        text = text.replace("versão:", "versao:")
        text = text.replace(" versão ", " versao ")  # espaco em volta
        text = text.replace(" versão,", " versao,")
        text = text.replace(" versão)", " versao)")
        text = text.replace("(versão,", "(versao,")
        text = text.replace(" versão;", " versao;")
        text = text.replace(" versão.", " versao.")
        # Caso 7: app_versão
        text = text.replace("app_versão:", "app_versao:")
        # Caso 8: versão_servidor, versão_cliente
        text = text.replace("versão_servidor", "versao_servidor")
        text = text.replace("versão_cliente_a", "versao_cliente_a")
        # Caso 9: parâmetro de função versao (sync.js)
        text = text.replace("(db, sessao, tabela, operacao, registroId, versão, payload)",
                            "(db, sessao, tabela, operacao, registroId, versao, payload)")
        text = text.replace("Number(versão || 1)", "Number(versao || 1)")

        if text != original:
            f.write_text(text, encoding='utf-8')
            rel = str(f).replace('\\', '/')
            print(f"{rel}: ok")
