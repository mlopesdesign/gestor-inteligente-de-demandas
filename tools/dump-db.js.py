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

for path, entry in find_entry(header, ''):
    if 'src/js/backend/db.js' in path:
        off = int(entry['offset'])
        size = int(entry['size'])
        content = data[off:off+size].decode('utf-8')
        # pegar primeiros 500 chars
        print('First 500 chars of db.js in .neu:')
        print(content[:500])
        print()
        print('--- contains "enfileirarDadosLegados":', 'enfileirarDadosLegados' in content)
        print('--- contains "window.__sessao":', 'window.__sessao' in content)
        print('--- contains "FIX v0.2.40":', 'FIX v0.2.40' in content)
        print('--- contains "FIX v0.2.47":', 'FIX v0.2.47' in content)
        print('--- size:', size)
        break
