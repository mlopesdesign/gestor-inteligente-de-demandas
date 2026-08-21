#!/usr/bin/env python3
"""Dump o JSON header do .neu pra ver o schema."""
with open(r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu', 'rb') as f:
    data = f.read()

# achar JSON
idx = data.find(b'{"fi')
if idx < 0:
    print('JSON nao encontrado')
    raise SystemExit(1)
# pegar primeiros 2KB do JSON
end = idx
depth = 0
for i in range(idx, min(idx+500000, len(data))):
    c = chr(data[i])
    if c == '{': depth += 1
    elif c == '}':
        depth -= 1
        if depth == 0:
            end = i
            break
json_str = data[idx:end+1].decode('utf-8')
print('JSON length:', len(json_str))
print('First 500 chars:')
print(json_str[:500])
print()
print('Keys at root:', list(json.loads(json_str).keys())[:20])
