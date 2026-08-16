#!/usr/bin/env python
"""Extrai arquivo do .neu lendo do offset"""
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

# Header binario tem 16 bytes antes do JSON
HEADER_END = start
HEADER_START = 0
# Achar onde comeca o JSON: tem 4 ints (16 bytes) antes
# Mas o start eh o primeiro { do JSON, e antes tem header

js = data[start:end].decode('utf-8', errors='replace')
j = json.loads(js)

parts = ALVO.split('/')
n = j
for p in parts:
    if p in n.get('files', {}):
        n = n['files'][p]
    else:
        print(f'NOT FOUND: {p}')
        sys.exit(1)

# n tem size, offset, integrity
# offset eh dentro do arquivo
print('size:', n.get('size'))
print('offset:', n.get('offset'))
print('integrity:', n.get('integrity'))
# JSON termina em 'end'. Apos o JSON vem o conteudo dos arquivos
content_start = end
# Os arquivos sao concatenados apos o JSON, em alguma ordem
# Vou ler tudo e procurar a string magica
blob = data[content_start:]
print('blob len:', len(blob))
print('first 200 bytes:', blob[:200].hex())

# Vou varrer procurando arquivos pelo tamanho e offset
# O offset aqui eh a posicao DENTRO do blob concatenado, nao no arquivo
# Vou ler os primeiros N bytes e tentar decodar
file_size = n['size']
file_offset = n['offset']
# Pega do offset no blob
raw = blob[file_offset:file_offset + file_size]
print('raw first 100:', raw[:100].hex())
try:
    text = zlib.decompress(raw).decode('utf-8', errors='replace')
except Exception as e:
    print('decompress error:', e)
    text = raw.decode('utf-8', errors='replace')
print('--- CONTENT ---')
print(text)
