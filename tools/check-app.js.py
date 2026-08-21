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
        print('v0.2.47 count:', content.count('v0.2.47'))
        print('enfileirarDadosLegados call count:', content.count('enfileirarDadosLegados'))
        # encontrar trecho com a chamada
        i1 = content.find("enfileirarDadosLegados (login):")
        print('login call offset:', i1)
        i2 = content.find("enfileirarDadosLegados (auto-demo):")
        print('auto-demo call offset:', i2)
        # versao
        i3 = content.find("'0.2.40'")
        print("'0.2.40' offset:", i3)
        i4 = content.find("'0.2.47'")
        print("'0.2.47' offset:", i4)
        break
