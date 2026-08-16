#!/usr/bin/env python
"""
Constrói o resources.neu manualmente (sem o bug do neu build).

Formato do .neu (extensão do ASAR do Electron):
- 4 bytes: header size (pickle com writeUInt32 do tamanho do headerBuf)
- 4 bytes: ? (no .neu aparece 0x00000004, mas acho que é parte do pickle)
- headerBuf: pickle com a string JSON do header
- arquivos concatenados a partir do offset declarado

Em vez de pickle, vou tentar o formato mais simples:
- 8 bytes: 2 ints (versão=4, headerSize)
- headerSize bytes: JSON
- binario: arquivos concatenados
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
# 1. neutralino.config.json
FILES.append(('neutralino.config.json', os.path.join(ROOT, 'neutralino.config.json')))
# 2. Todos os arquivos em src/
for dirpath, dirnames, filenames in os.walk(SRC_DIR):
    for fn in filenames:
        full = os.path.join(dirpath, fn)
        rel = os.path.relpath(full, ROOT).replace('\\', '/')
        FILES.append((rel, full))

# Calcula SHA256 de cada arquivo
def sha256(data):
    return hashlib.sha256(data).hexdigest()

# Calcula offsets (sem padding, sem os 3 bytes bugados)
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

# Header: 4 bytes magic (4) + 4 bytes json_size + 4 bytes (json_size-4?) + 4 bytes json_size
# Mas vou tentar: 4 bytes (json_size) + 4 bytes (json_size) + JSON + binario
# Vou seguir o padrao exato do .neu existente
# Magic: 4 bytes 0x04
# Em seguida 3 ints

# O .neu tem: 04 00 00 00 3c 27 00 00 38 27 00 00 31 27 00 00
# 4, 10044, 10040, 10033
# 10033 = tamanho do JSON
# 10040 = ?
# 10044 = ?
# Vou usar: 4, 10044, 10040, 10033 onde:
# 10033 = json_size
# 10040 = json_size + 7? 
# 10044 = json_size + 11?

# Vou tentar primeiro o padrao exato e ver se funciona
# Ajustando para o tamanho real do JSON
magic = struct.pack('<I', 4)
field1 = struct.pack('<I', json_size + 11)  # 10044 quando json=10033
field2 = struct.pack('<I', json_size + 7)   # 10040 quando json=10033
field3 = struct.pack('<I', json_size)       # 10033 quando json=10033

# Escreve o arquivo
with open(NEU_PATH, 'wb') as f:
    f.write(magic)
    f.write(field1)
    f.write(field2)
    f.write(field3)
    f.write(json_bytes)
    for rel, full in FILES:
        with open(full, 'rb') as src:
            f.write(src.read())

print(f'[neu-manual] OK em {NEU_PATH}')
print(f'[neu-manual] Tamanho: {os.path.getsize(NEU_PATH)} bytes')
print(f'[neu-manual] JSON size: {json_size} bytes')
print(f'[neu-manual] Arquivos: {len(FILES)}')
