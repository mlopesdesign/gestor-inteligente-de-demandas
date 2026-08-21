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

# Extrair manualmente o que ESTÁ nos offsets do db.js e do app.js
# app.js declarado offset 1990, size 2000 (teste)
for top_name, top_val in header['files'].items():
    print(top_name, list(top_val.keys())[:5] if isinstance(top_val, dict) else type(top_val))
