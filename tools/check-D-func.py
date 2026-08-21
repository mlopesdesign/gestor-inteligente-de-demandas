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
def walk(node, path):
    if 'files' in node:
        for name, sub in node['files'].items():
            full = path + '/' + name
            if 'offset' in sub and 'size' in sub:
                yield full, sub
            else:
                yield from walk(sub, full)
for p, e in walk(header, ''):
    if 'src/js/app.js' in p:
        off = int(e['offset'])
        size = int(e['size'])
        real = 11695 + off
        content = data[real:real+size].decode('utf-8')
        # Ver o D() function
        idx2 = content.find('function D(')
        if idx2 >= 0:
            snippet = content[idx2:idx2+1500]
            # Truncar pra nao printar tudo
            print('--- D() func snippet ---')
            print(snippet[:1500])
        break
