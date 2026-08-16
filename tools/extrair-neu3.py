#!/usr/bin/env python
"""Extrai arquivo do .neu - segunda tentativa"""
import json
import sys
import zlib

ARQUIVO = sys.argv[1]
ALVO = sys.argv[2] if len(sys.argv) > 2 else "src/js/telas/stubs.js"

with open(ARQUIVO, 'rb') as f:
    data = f.read()

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
    elif b == 0x5c:
        escape = True
    elif b == 0x22:
        in_string = not in_string
    elif not in_string:
        if b == 0x7b:
            depth += 1
        elif b == 0x7d:
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    i += 1

js = data[start:end].decode('utf-8', errors='replace')
j = json.loads(js)

# Imprimir estrutura do JSON
print('top keys:', list(j.keys()))
print('blob size:', len(j.get('blob', '')))

# Decodifica o blob (base64) -> zlib -> bytes
import base64
blob_b64 = j.get('blob', '')
blob_raw = base64.b64decode(blob_b64)
print('blob_raw len:', len(blob_raw))
print('blob first 32 bytes hex:', blob_raw[:32].hex())
# Tenta descomprimir
try:
    blob_decomp = zlib.decompress(blob_raw)
    print('decompressed:', len(blob_decomp), 'first 200 bytes:', blob_decomp[:200])
except Exception as e:
    print('decompress err:', e)
    blob_decomp = blob_raw

# Agora acha o arquivo
parts = ALVO.split('/')
n = j
for p in parts:
    if p in n.get('files', {}):
        n = n['files'][p]
    else:
        print(f'NOT FOUND: {p}')
        sys.exit(1)

offset = int(n['offset'])
size = int(n['size'])
print(f'target: offset={offset}, size={size}')

raw = blob_decomp[offset:offset+size]
try:
    text = zlib.decompress(raw).decode('utf-8', errors='replace')
except:
    text = raw.decode('utf-8', errors='replace')
print('--- CONTENT ---')
print(text)
