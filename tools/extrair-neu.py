#!/usr/bin/env python
"""Extrai um arquivo do resources.neu"""
import json
import sys
import base64
import zlib

ARQUIVO = sys.argv[1]
ALVO = sys.argv[2] if len(sys.argv) > 2 else "src/js/telas/stubs.js"

with open(ARQUIVO, 'rb') as f:
    data = f.read()

# Pula o header binario ate o JSON
start = data.find(b'{"files"')
i = start
depth = 0
end = -1
in_string = False
escape = False
while i < len(data):
    c = data[i:i+1]
    b = c[0]
    if escape:
        escape = False
    elif b == 0x5c:  # backslash
        escape = True
    elif b == 0x22:  # aspas
        in_string = not in_string
    elif not in_string:
        if b == 0x7b:  # {
            depth += 1
        elif b == 0x7d:  # }
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    i += 1

js = data[start:end].decode('utf-8', errors='replace')
j = json.loads(js)

# Caminho do alvo
parts = ALVO.split('/')
n = j
for p in parts:
    if p in n.get('files', {}):
        n = n['files'][p]
    else:
        print(f'NOT FOUND: {p}')
        sys.exit(1)

# Extrair
if 'data' in n:
    raw = base64.b64decode(n['data'])
    try:
        text = zlib.decompress(raw).decode('utf-8', errors='replace')
    except:
        text = raw.decode('utf-8', errors='replace')
    print(text)
elif 'blob' in n:
    raw = base64.b64decode(n['blob'])
    try:
        text = zlib.decompress(raw).decode('utf-8', errors='replace')
    except:
        text = raw.decode('utf-8', errors='replace')
    print(text)
else:
    print('NO data/blob in:', n.keys())
