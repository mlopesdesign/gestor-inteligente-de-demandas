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

# Onde o <!DOCTYPE html> esta'?
search = data.find(b'<!DOCTYPE')
print(f'<!DOCTYPE html> offset real: {search}')
# 16 + 11679 = 11695
# Onde o "Carregando..." (string do index.html) esta'?
search2 = data.find(b'Carregando')
print(f'Carregando offset: {search2}')
# Onde o "<!DOCTYPE html" EXATO?
# 11695 + offset declarado do index.html
# index.html offset 1851 -> 11695 + 1851 = 13546
print(f'11695 + 1851 = {11695 + 1851}')
# Bate?
print(f'  bate? {search == 11695 + 1851}')

# Agora db.js: offset declarado 87010, real 11695+87010 = 98705
print()
print('db.js:')
real_off = 11695 + 87010
print(f'  offset declarado: 87010')
print(f'  offset real esperado: {real_off}')
print(f'  primeiros 200 bytes: {data[real_off:real_off+200]!r}')
# Conferir com o source
with open(r'E:\Projetos\LOPES FOCUS\src\js\backend\db.js', 'rb') as f:
    src = f.read()
print(f'  source primeiros 200 bytes: {src[:200]!r}')
print(f'  source v0.2.47 count: {src.count(b"v0.2.47")}')
print(f'  data no offset real v0.2.47 count: {data[real_off:real_off+src.__len__()].count(b"v0.2.47")}')
