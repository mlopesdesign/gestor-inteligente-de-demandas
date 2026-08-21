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

# extrair todos os paths com seu offset+size
def walk(node, path):
    if 'files' in node:
        for name, sub in node['files'].items():
            full = path + '/' + name
            if 'offset' in sub and 'size' in sub:
                yield full, sub
            else:
                yield from walk(sub, full)

# imprimir paths com 'src/js'
for p, e in walk(header, ''):
    if 'src/js/app.js' in p or 'src/js/backend/db.js' in p or 'src/js/backend/servidor.js' in p or 'src/js/backend/permissoes.js' in p:
        off = int(e['offset'])
        size = int(e['size'])
        # extrair primeiros 80 chars
        sample = data[off:off+min(80,size)].decode('utf-8', errors='replace')
        print(f'{p}  off={off} size={size}  sample={sample[:80]!r}')
