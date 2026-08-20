#!/usr/bin/env python3
"""Detecta o que sobrou de double-encoded nos arquivos."""
import sys
import re
from pathlib import Path

for arg in sys.argv[1:]:
    p = Path(arg)
    if p.is_dir():
        files = list(p.rglob('*.js')) + list(p.rglob('*.html')) + list(p.rglob('*.css')) + list(p.rglob('*.json'))
    else:
        files = [p]
    for f in files:
        if not f.is_file():
            continue
        try:
            text = f.read_text(encoding='utf-8')
        except Exception:
            continue
        # Procura padrões double-encoded
        bad_patterns = re.findall(r'[\xc0-\xff][\x80-\xbf][\xc0-\xff][\x80-\xbf]', text)
        if bad_patterns:
            from collections import Counter
            c = Counter(bad_patterns)
            for pat, n in c.most_common(5):
                # Decodifica essa string como Latin-1
                try:
                    decoded = pat.encode('latin-1').decode('utf-8')
                except Exception:
                    decoded = '?'
                print(f"{f.name}: {repr(pat)} ({n}x) -> '{decoded}'")
