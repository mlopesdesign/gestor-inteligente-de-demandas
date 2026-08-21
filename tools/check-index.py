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
    if 'index.html' in p:
        off = int(e['offset'])
        size = int(e['size'])
        # Conferir o conteudo
        sample = data[off:off+50]
        print(f'offset declarado: {off}, sample: {sample!r}')
        # agora, calcular onde o index.html REALMENTE esta
        # O Neutralino, quando carrega, soma 16+json_size? Ou nao?
        json_size_real = idx - 16  # offset do JSON - header
        print(f'JSON real começa em {idx}, header 16 bytes, json_size estimado {json_size_real}')
        # Vamos procurar o inicio do index.html no arquivo
        search = data.find(b'<!DOCTYPE html>')
        print(f'<!DOCTYPE html> aparece no offset: {search}')
        # ver o conteudo no offset declarado
        if sample.startswith(b'<!DOCTYPE'):
            print('OK offset bate com posicao real (Neutralino le direto do offset)')
        else:
            print('NAO BATE - o offset declarado esta errado')
