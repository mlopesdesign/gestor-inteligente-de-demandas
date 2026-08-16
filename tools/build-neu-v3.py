#!/usr/bin/env python
"""
Constroi o resources.neu seguindo EXATAMENTE o formato do neu build original
(que tem 3 bytes de padding que o servidor espera).
"""
import os
import sys
import struct
import json
import hashlib

ROOT = sys.argv[1] if len(sys.argv) > 1 else r'E:\Projetos\LOPES FOCUS'
DIST_DIR = os.path.join(ROOT, 'dist')
NEU_PATH = os.path.join(DIST_DIR, 'resources.neu')
SRC_DIR = os.path.join(ROOT, 'src')

FILES = []
FILES.append(('neutralino.config.json', os.path.join(ROOT, 'neutralino.config.json')))
for dirpath, dirnames, filenames in os.walk(SRC_DIR):
    for fn in filenames:
        full = os.path.join(dirpath, fn)
        rel = os.path.relpath(full, ROOT).replace('\\', '/')
        FILES.append((rel, full))

def sha256(data):
    return hashlib.sha256(data).hexdigest()

# Constroi JSON header
header = {'files': {}}
offset = 0
file_data = []
for rel, full in FILES:
    with open(full, 'rb') as f:
        data = f.read()
    file_data.append((rel, data))
    size = len(data)
    parts = rel.split('/')
    cur = header['files']
    for p in parts[:-1]:
        if p not in cur:
            cur[p] = {'files': {}}
        cur = cur[p]['files']
    cur[parts[-1]] = {
        'size': str(size),
        'offset': str(offset),
        'integrity': {
            'algorithm': 'SHA256',
            'hash': sha256(data),
            'blockSize': 4194304,
            'blocks': [sha256(data)],
        },
    }
    offset += size

json_str = json.dumps(header, separators=(',', ':'))
json_bytes = json_str.encode('utf-8')
json_size = len(json_bytes)

# Header EXATO do neu build
magic = struct.pack('<I', 4)
field2 = struct.pack('<I', json_size + 11)
field3 = struct.pack('<I', json_size + 7)
field4 = struct.pack('<I', json_size)

with open(NEU_PATH, 'wb') as f:
    f.write(magic)
    f.write(field2)
    f.write(field3)
    f.write(field4)
    f.write(json_bytes)
    # 3 bytes de padding que o servidor espera
    f.write(b'\x00\x00\x00')
    for rel, data in file_data:
        f.write(data)

print(f'[neu-manual] OK em {NEU_PATH}')
print(f'[neu-manual] Tamanho: {os.path.getsize(NEU_PATH)} bytes')
print(f'[neu-manual] JSON size: {json_size} bytes')
print(f'[neu-manual] Arquivos: {len(FILES)}')
