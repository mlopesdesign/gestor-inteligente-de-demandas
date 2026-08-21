#!/usr/bin/env python3
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
header = json.loads(data[idx:end+1].decode('utf-8'))

def find_entry(node, path):
    if 'files' in node:
        for name, sub in node['files'].items():
            full = path + '/' + name
            if 'offset' in sub and 'size' in sub:
                yield full, sub
            else:
                yield from find_entry(sub, full)

# listar todos que contem 'db.js' no path
for path, entry in find_entry(header, ''):
    if 'db.js' in path:
        off = int(entry['offset'])
        size = int(entry['size'])
        content = data[off:off+200].decode('utf-8', errors='replace')
        print(f'{path}  size={size}')
        print(f'  first200: {content[:200]}')
        print()
