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

paths = []
for path, entry in find_entry(header, ''):
    paths.append((path, int(entry['size']), int(entry['offset'])))

# procurar especificamente 'backend'
print('Total files:', len(paths))
for p, s, o in paths:
    if 'backend' in p:
        print(f'  {p} size={s} offset={o}')
