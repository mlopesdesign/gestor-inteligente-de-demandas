#!/usr/bin/env python
"""
Constrói o resources.neu manualmente, seguindo o formato ASAR (Electron).

Formato:
- 8 bytes: sizePickle (4 bytes header + 4 bytes payload = tamanho do headerBuf)
- N bytes: headerPickle (4 bytes headerSize + payload com 4 bytes length + JSON aligned to 4)
- arquivos concatenados a partir do offset declarado no JSON

Decidi seguir o padrao exato do .neu gerado pelo neu build original:
- 4 bytes: magic (4)
- 4 bytes: json_size + 11
- 4 bytes: json_size + 7
- 4 bytes: json_size
- json_size bytes: JSON
- arquivos concatenados
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

# Arquivos a incluir
FILES = []
FILES.append(('neutralino.config.json', os.path.join(ROOT, 'neutralino.config.json')))
# Outros arquivos do src/
for dirpath, dirnames, filenames in os.walk(SRC_DIR):
    for fn in filenames:
        full = os.path.join(dirpath, fn)
        rel = os.path.relpath(full, ROOT).replace('\\', '/')
        FILES.append((rel, full))

# SHA256
def sha256(data):
    return hashlib.sha256(data).hexdigest()

# Header (no JSON, na ordem que o ASAR cria)
header = {'files': {}}
offset = 0
for rel, full in FILES:
    with open(full, 'rb') as f:
        data = f.read()
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

# Serializa o JSON
json_str = json.dumps(header, separators=(',', ':'))
json_bytes = json_str.encode('utf-8')
json_size = len(json_bytes)

# Header do .neu (formato exato do neu build):
# 4 bytes: 0x04 (magic/versão)
# 4 bytes: json_size + 11 (headerPickle size)
# 4 bytes: json_size + 7  (headerPickle payload size)
# 4 bytes: json_size       (json length)
# json_size bytes: JSON
# arquivos concatenados
#
# Explicação:
# - field4 (json_size) = length escrito pelo writeString
# - field3 (json_size + 7) = writeString payload (4 bytes length + json bytes aligned to 4)
#   para json_size=10033: 4 + 10036 (10033+3 padding) = 10040
# - field2 (json_size + 11) = total do headerPickle (4 headerSize + 10040 payload) = 10044
# - field1 (4) = magic

magic = struct.pack('<I', 4)
field2 = struct.pack('<I', json_size + 11)  # headerPickle total
field3 = struct.pack('<I', json_size + 7)   # headerPickle payload
field4 = struct.pack('<I', json_size)       # json length

with open(NEU_PATH, 'wb') as f:
    f.write(magic)
    f.write(field2)
    f.write(field3)
    f.write(field4)
    f.write(json_bytes)
    for rel, full in FILES:
        with open(full, 'rb') as src:
            f.write(src.read())

print(f'[neu-manual] OK em {NEU_PATH}')
print(f'[neu-manual] Tamanho: {os.path.getsize(NEU_PATH)} bytes')
print(f'[neu-manual] JSON size: {json_size} bytes')
print(f'[neu-manual] headerPickle total: {json_size + 11} bytes')
print(f'[neu-manual] Arquivos: {len(FILES)}')
