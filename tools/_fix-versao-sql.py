#!/usr/bin/env python3
"""Reverte 'versão' -> 'versao' em SQL strings (mas nao em UI text)."""
import re
import sys
from pathlib import Path

# Padroes a reverter (todos em SQL):
# 1. versão=versão+1 (em string SQL)
# 2. AND versão = ? (no WHERE)
# 3. WHERE id = ? AND usuario_id = ? AND versão = ?
# 4. versão_export (variavel JS, mas eh usada como DTO field, deve ser versao_export)
# 5. app_versão: -> app_versao:
# 6. versão_servidor, versão_cliente (em sync DTO)
# 7. versão (parametro de funcao em enfileirarMudanca - eh nome de param)
# 8. 'versão' (string em payload do sync) - reverter pra 'versao'

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
        # Em strings SQL: versao=versao+1 (sem acento)
        text = text.replace("'versão=versão+1'", "'versao=versao+1'")
        text = text.replace('"versão=versão+1"', '"versao=versao+1"')
        # Em SQL: AND versão = ?
        text = text.replace('AND versão = ?', 'AND versao = ?')
        # versao_servidor, versao_cliente (sync DTO)
        text = text.replace('versão_servidor', 'versao_servidor')
        text = text.replace('versão_cliente', 'versao_cliente')
        # app_versão: (sync.js DTO)
        text = text.replace('app_versão:', 'app_versao:')
        # versão_export (variavel JS)
        text = text.replace('versão_export', 'versao_export')
        # parametro de funcao: enfileirarMudanca(..., versão, ...)
        # So no contexto de funcao, nao em UI
        # function enfileirarMudanca(db, sessao, tabela, operacao, registroId, versão, payload)
        # Ja foi revertido em parte pelo script anterior. Verificar.
        # 'versão' (em payload do sync) - reverter
        text = text.replace("'versão'", "'versao'")
        # UPDATE tarefas SET status='CONCLUIDO'... versão=versão+1
        text = text.replace("'versão=versão+1", "'versao=versao+1")
        # Em queries: versão, (lista de colunas)
        text = text.replace(" versão, ", " versao, ")
        text = text.replace(", versão, ", ", versao, ")
        text = text.replace(", versão)", ", versao)")
        # Em sync_conflict_resolver etc: campos 'versão'
        text = text.replace("'versão':", "'versao':")
        text = text.replace('"versão":', '"versao":')

        if text != original:
            f.write_text(text, encoding='utf-8')
            rel = str(f).replace('\\', '/')
            print(f"{rel}: ok")
