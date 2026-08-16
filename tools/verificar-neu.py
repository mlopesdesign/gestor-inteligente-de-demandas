#!/usr/bin/env python
"""Verifica o .neu comparando offsets declarados vs reais"""
import json
import sys

ARQUIVO = sys.argv[1]

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
binary = data[end:]

print(f'Arquivo: {ARQUIVO}')
print(f'Binary len: {len(binary)}')
print()

def walk(node, prefix=''):
    items = []
    for k, v in node.get('files', {}).items():
        path = prefix + '/' + k if prefix else k
        if 'files' in v and 'size' not in v:
            items.extend(walk(v, path))
        else:
            items.append((path, v))
    return items

files = walk(j)
for path, v in files:
    decl_offset = int(v['offset'])
    decl_size = int(v['size'])
    # Pega primeiros 20 bytes do conteudo declarado
    real_start = binary[decl_offset:decl_offset+20]
    # Tenta achar no conteudo real
    print(f'{path[:60]:60}  offset={decl_offset:>7}  size={decl_size:>5}  start={real_start[:8].hex()}')
