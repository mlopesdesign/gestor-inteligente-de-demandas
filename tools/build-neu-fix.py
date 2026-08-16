#!/usr/bin/env python
"""
Corrige o bug do neu build que adiciona 3 bytes de padding no inicio do binario.
O bug faz o servidor encontrar os arquivos mas o conteudo fica corrompido.

Estrategia: le o .neu do neu build, remove os 3 primeiros bytes do binario,
e recalcula os offsets no JSON (todos diminuem em 3 bytes).
"""
import os
import sys
import json
import struct

NEU_IN = sys.argv[1]
NEU_OUT = sys.argv[2]

with open(NEU_IN, 'rb') as f:
    data = f.read()

# Acha o JSON
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

js = data[start:end].decode('utf-8')
j = json.loads(js)
binary = data[end:]

# Remove os 3 primeiros bytes do binario
binary_fixed = binary[3:]

# Recalcula os offsets (todos diminuem em 3)
def fix_offsets(node, delta):
    for k, v in node.get('files', {}).items():
        if 'files' in v and 'size' not in v:
            fix_offsets(v, delta)
        else:
            v['offset'] = str(int(v['offset']) - delta)

fix_offsets(j, 3)

# Serializa o JSON de volta
new_js = json.dumps(j, separators=(',', ':'))
new_js_bytes = new_js.encode('utf-8')
new_js_size = len(new_js_bytes)

# Header
magic = struct.pack('<I', 4)
field2 = struct.pack('<I', new_js_size + 11)
field3 = struct.pack('<I', new_js_size + 7)
field4 = struct.pack('<I', new_js_size)

with open(NEU_OUT, 'wb') as f:
    f.write(magic)
    f.write(field2)
    f.write(field3)
    f.write(field4)
    f.write(new_js_bytes)
    f.write(binary_fixed)

print(f'[neu-fix] Removidos 3 bytes de padding')
print(f'[neu-fix] Tamanho original: {len(data)}')
print(f'[neu-fix] Tamanho corrigido: {os.path.getsize(NEU_OUT)}')
print(f'[neu-fix] OK em {NEU_OUT}')
