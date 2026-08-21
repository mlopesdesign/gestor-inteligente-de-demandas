#!/usr/bin/env python3
"""Verifica se o .neu tem o codigo v0.2.47"""
import json

with open(r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu', 'rb') as f:
    data = f.read()

idx = data.find(b'{"fi')
depth = 0
end = idx
for i in range(idx, len(data)):
    c = chr(data[i])
    if c == '{': depth += 1
    elif c == '}':
        depth -= 1
        if depth == 0:
            end = i
            break
json_str = data[idx:end+1].decode('utf-8')
header = json.loads(json_str)

# Caminho recursivo no dict
def find_entry(node, path):
    if 'files' in node:
        for name, sub in node['files'].items():
            full = path + '/' + name
            if 'offset' in sub and 'size' in sub:
                yield full, sub
            else:
                yield from find_entry(sub, full)

# achar db.js
for path, entry in find_entry(header, ''):
    if 'src/js/backend/db.js' in path:
        off = int(entry['offset'])
        size = int(entry['size'])
        content = data[off:off+size].decode('utf-8')
        print(f'db.js @ {path}')
        print(f'  size={size}')
        print(f'  v0.2.47 count: {content.count("v0.2.47")}')
        print(f'  v0.2.40 count: {content.count("v0.2.40")}')
        print(f'  dbInstance.exec: {content.count("dbInstance.exec")}')
        print(f'  db.exec: {content.count("db.exec")}')
        print(f'  enfileirarDadosLegados func: {"export async function enfileirarDadosLegados" in content}')
        break

# permissoes.js
for path, entry in find_entry(header, ''):
    if 'src/js/backend/permissoes.js' in path:
        off = int(entry['offset'])
        size = int(entry['size'])
        content = data[off:off+size].decode('utf-8')
        print(f'\npermissoes.js @ {path}')
        print(f'  db:enfileirarDadosLegados registrado: {chr(39) + "db:enfileirarDadosLegados" + chr(39) in content}')
        break

# servidor.js
for path, entry in find_entry(header, ''):
    if 'src/js/backend/servidor.js' in path:
        off = int(entry['offset'])
        size = int(entry['size'])
        content = data[off:off+size].decode('utf-8')
        print(f'\nservidor.js @ {path}')
        print(f'  case db:enfileirarDadosLegados: {"case ' + chr(39) + 'db:enfileirarDadosLegados" in content}')
        break

# app.js
for path, entry in find_entry(header, ''):
    if 'src/js/app.js' in path:
        off = int(entry['offset'])
        size = int(entry['size'])
        content = data[off:off+size].decode('utf-8')
        print(f'\napp.js @ {path}')
        print(f'  v0.2.47 count: {content.count("v0.2.47")}')
        print(f'  enfileirarDadosLegados call: {content.count("enfileirarDadosLegados")}')
        break
