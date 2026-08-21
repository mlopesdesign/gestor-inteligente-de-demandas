#!/usr/bin/env python3
"""Dump trecho do app.js dentro do .neu pra ver o que tem."""
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

def find_entry(node, path):
    if 'files' in node:
        for name, sub in node['files'].items():
            full = path + '/' + name
            if 'offset' in sub and 'size' in sub:
                yield full, sub
            else:
                yield from find_entry(sub, full)

for path, entry in find_entry(header, ''):
    if 'src/js/app.js' in path and 'vendor' not in path:
        off = int(entry['offset'])
        size = int(entry['size'])
        content = data[off:off+size].decode('utf-8')
        # achar trecho com v0.2.47
        idx2 = content.find('v0.2.47')
        if idx2 > 0:
            print('Contexto do v0.2.47:')
            print(content[max(0,idx2-200):idx2+300])
        print()
        print('--- enfileirarDadosLegados count:', content.count('enfileirarDadosLegados'))
        print('--- v0.2.40 count:', content.count('v0.2.40'))
        print('--- 0.2.40 (sem v) count:', content.count("'0.2.40'"))
        break
