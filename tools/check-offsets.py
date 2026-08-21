#!/usr/bin/env python3
import json
with open(r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu', 'rb') as f:
    data = f.read()
print('Total size:', len(data))
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
def walk(node, path):
    if 'files' in node:
        for name, sub in node['files'].items():
            full = path + '/' + name
            if 'offset' in sub and 'size' in sub:
                yield full, sub
            else:
                yield from walk(sub, full)
sizes = []
offsets = []
for p, e in walk(header, ''):
    sizes.append(int(e['size']))
    offsets.append(int(e['offset']))
print('Soma de todos os sizes:', sum(sizes))
print('Soma de offsets+size max:', max(o+s for o, s in zip(offsets, sizes)))
# 16 (header) + 11679 (json) + soma
print('Esperado: 16+11679+sizes =', 16+11679+sum(sizes))
# comparar primeiro offset
print('Primeiro offset:', offsets[0], 'soma esperada: 16+11679 =', 16+11679)
