#!/usr/bin/env python3
"""
Reverte 'versão' -> 'versao' em contextos onde eh nome de coluna SQL
ou nome de variavel JS, NAO onde eh texto de UI visivel ao usuario.

Causa: fix-utf8-double-encoded converteu 'versao' (sem acento) para
'versão' (com acento) em MUITOS lugares onde nao devia (nomes de coluna,
variaveis, DTO fields, etc). O SQLite falha com 'no such column: t.versão'.

Padroes a reverter:
- t.versão, c.versão, a.versão, p.versão, s.versão, d.versão, r.versão
- versão+1, versão =  -> versao+1, versao =
- ? versões -> ? versoes (param SQL placeholder)
- dados.versão, t.versão, p.versão (objetos JS)
- 'versão' (string em payload API) -> 'versao'
- "versão" (string em payload API) -> "versao"
- versao_export (variavel) - ja sem acento, nao mexer

NAO reverter:
- "Nova versão" (texto de UI)
- "versão instalada" (texto de UI)
- "versão mais recente" (texto de UI)
- "versão do plugin" (texto de UI)
- "qual versão" (texto)
"""
import re
import sys
from pathlib import Path

# Padroes: regex -> substituicao
# Sao especificos pra evitar mexer em strings de UI
PATTERNS = [
    # t.versão -> t.versao (em qualquer arquivo .js, eh nome de campo)
    (r'\.versão\b', '.versao'),
    # WHERE versão = ? -> WHERE versao = ? (em SQL strings)
    (r'\bWHERE\s+versão\b', 'WHERE versao'),
    # SET versão = versão + 1 -> SET versao = versao + 1
    (r'\bSET\s+versão\s*=\s*versão\s*\+\s*1', 'SET versao = versao + 1'),
    (r'\bSET\s+versão\s*=\s*\?', 'SET versao = ?'),
    # "versão": -> "versao": (em DTOs)
    (r"'versão':", "'versao':"),
    (r'"versão":', '"versao":'),
    # versão: -> versao: (em DTOs sem aspas)
    (r'\bversão:', 'versao:'),
    # "versão" -> "versao" (em payload string)
    (r"'versão'", "'versao'"),
    (r'"versão"', '"versao"'),
    # versao, (em destructure de objeto)
    (r'\{[^}]*\bversão\b[^}]*\}', lambda m: m.group(0).replace('versão', 'versao')),
    # versao_id? (param placeholder em INSERT)
    (r'\bINSERT\s+INTO\s+[a-z_]+\([^)]*\bversão\b[^)]*\)', lambda m: m.group(0).replace('versão', 'versao')),
    # versao_export (ja sem acento, nao mexer)
]

# Processa apenas arquivos JS
for arg in sys.argv[1:]:
    p = Path(arg)
    if p.is_dir():
        files = list(p.rglob('*.js'))
    else:
        files = [p]
    total_subs = 0
    for f in files:
        if not f.is_file():
            continue
        try:
            text = f.read_text(encoding='utf-8')
        except Exception:
            continue
        original = text
        for pattern, repl in PATTERNS:
            if callable(repl):
                text = re.sub(pattern, repl, text)
            else:
                text = re.sub(pattern, repl, text)
        if text != original:
            f.write_text(text, encoding='utf-8')
            rel = str(f).replace('\\', '/')
            print(f"{rel}: revertido")
            total_subs += 1
    print(f"\nTotal: {total_subs} arquivo(s) revertido(s)")
