#!/usr/bin/env python
"""Lista todos os arquivos do .neu com offset e size"""
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

def walk(node, prefix=''):
    if 'files' not in node: return
    for k, v in node['files'].items():
        path = prefix + '/' + k if prefix else k
        if 'files' in v and 'size' not in v:
            walk(v, path)
        else:
            print(f'{int(v["offset"]):>8}  {int(v["size"]):>8}  {path}')

walk(j)
