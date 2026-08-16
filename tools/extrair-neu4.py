#!/usr/bin/env python
"""Extrai arquivo do .neu"""
import json
import sys
import zlib

ARQUIVO = sys.argv[1]
ALVO = sys.argv[2] if len(sys.argv) > 2 else "src/js/telas/stubs.js"

with open(ARQUIVO, 'rb') as f:
    data = f.read()

# Header binario: 16 bytes (4 ints LE32)
# Formato: [4 bytes magic?][4 bytes json_size?][4 bytes ?][4 bytes ?]
# Vou pegar 32 bytes pra ver
print('header first 32:', data[:32].hex())
# Os primeiros 4 bytes sao o tamanho do JSON? Vou testar
import struct
a, b, c, d = struct.unpack('<IIII', data[:16])
print(f'ints LE32: {a}, {b}, {c}, {d}')

# Acha JSON
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

print(f'JSON at {start} to {end}, len {end-start}')

js = data[start:end].decode('utf-8', errors='replace')
j = json.loads(js)

# O conteudo binario vem DEPOIS do JSON
# Calcula onde comeca o conteudo
content_start = end
print(f'content starts at {content_start}, file size {len(data)}')

# Calcula quanto do arquivo e conteudo binario
binary_size = len(data) - content_start
print(f'binary content size: {binary_size}')

# O conteudo eh zlib-compressed e concatenado
binary = data[content_start:]

# Tenta descomprimir tudo
try:
    full = zlib.decompress(binary)
    print(f'decompressed full: {len(full)} bytes')
except Exception as e:
    print('full decompress err:', e)
    # Tenta streaming
    d = zlib.decompressobj()
    try:
        full = d.decompress(binary)
        print(f'stream decompress: {len(full)}')
    except Exception as e2:
        print('stream err:', e2)
        full = binary

# Acha o arquivo
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

raw = full[offset:offset+size]
try:
    text = zlib.decompress(raw).decode('utf-8', errors='replace')
except:
    text = raw.decode('utf-8', errors='replace')
print('--- CONTENT ---')
print(text)
