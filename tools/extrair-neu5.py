#!/usr/bin/env python
"""Extrai arquivo do .neu"""
import json
import sys

ARQUIVO = sys.argv[1]
ALVO = sys.argv[2]

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
raw = binary[offset:offset+size]
sys.stdout.buffer.write(raw)
