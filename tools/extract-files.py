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
        content_bytes = data[off:off+size]
        # Salvar pra inspeção
        with open(r'E:\Projetos\LOPES FOCUS\tools\db-in-neu.js', 'wb') as out:
            out.write(content_bytes)
        print(f'Tamanho: {size} bytes, salvo em db-in-neu.js')
        # ver primeiros 1000 chars decoded
        try:
            content = content_bytes.decode('utf-8')
            print('First 1000 chars:')
            print(content[:1000])
        except Exception as e:
            print('decode erro:', e)
        break
