import struct, json
with open('dist/GestorInteligenteDeDemandas/resources.neu', 'rb') as f: data = f.read()
f3 = struct.unpack('<III', data[4:16])[2]
json_bytes = data[16:16+f3]
obj = json.loads(json_bytes.decode('utf-8'))
src = obj['files'].get('src', {}).get('files', {})
idx = src.get('index.html')
if idx:
    off = int(idx['offset']); size = int(idx['size'])
    real_off = 16 + f3 + off
    chunk = data[real_off:real_off+size]
    txt = chunk.decode('utf-8', errors='replace')
    if 'app-version' in txt and 'content="0.2.9"' in txt:
        print('OK: meta app-version=0.2.9 no index.html dentro do .neu')
    else:
        print('ATENCAO: meta nao encontrada ou com valor errado')
        import re
        m = re.search(r'meta name="app-version"[^>]*', txt)
        if m: print('FOUND:', m.group(0))
        else: print('NAO ACHOU meta nenhuma')
