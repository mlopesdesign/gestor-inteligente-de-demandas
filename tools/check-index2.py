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

# Show all paths with offset and size
def walk(node, path):
    if 'files' in node:
        for name, sub in node['files'].items():
            full = path + '/' + name
            if 'offset' in sub and 'size' in sub:
                yield full, sub
            else:
                yield from walk(sub, full)

# Mostrar offset do index.html e dos primeiros
items = list(walk(header, ''))
items.sort(key=lambda x: int(x[1]['offset']))
for p, e in items[:8]:
    off = int(e['offset'])
    size = int(e['size'])
    sample = data[off:off+30]
    print(f'{off:>7}  {p}  size={size}  bytes={sample!r}')

print()
# Onde o <!DOCTYPE html> REAL esta?
search = data.find(b'<!DOCTYPE')
print(f'<!DOCTYPE html> offset real: {search}')
search2 = data.find(b'<!doctype')
print(f'<!doctype html> offset real: {search2}')
