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
    if 'src/js/backend/db.js' in p:
        off = int(e['offset'])
        size = int(e['size'])
        real = 11695 + off
        content = data[real:real+size].decode('utf-8')
        # Ver se tem enfileirarDadosLegados export
        for marker in ['export async function enfileirarDadosLegados', 'export function enfileirarDadosLegados', 'function enfileirarDadosLegados', 'enfileirarDadosLegados']:
            if marker in content:
                print(f'  ACHEI: {marker!r}')
                idx2 = content.find(marker)
                print(f'  contexto: ...{content[max(0,idx2-50):idx2+200]}...')
                break
        else:
            print('  NAO ACHEI enfileirarDadosLegados em lugar nenhum do db.js no .neu')
        # listar todos os exports
        import re
        for m in re.finditer(r'^export\s+(async\s+)?function\s+(\w+)', content, re.MULTILINE):
            print(f'  export function: {m.group(2)}')
        break
