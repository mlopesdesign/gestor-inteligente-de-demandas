import json, base64, sys
with open(r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu', 'rb') as f:
    data = f.read()
start = data.find(b'{"files"')
i = start; depth = 0; end = -1; in_string = False; escape = False
while i < len(data):
    c = data[i]
    if escape: escape = False
    elif c == ord(chr(92)): escape = True
    elif c == ord('"'): in_string = not in_string
    elif not in_string:
        if c == ord('{'): depth += 1
        elif c == ord('}'):
            depth -= 1
            if depth == 0: end = i + 1; break
    i += 1
js = data[start:end].decode('utf-8', errors='replace')
j = json.loads(js)

def find_data(node, path_parts):
    if 'files' not in node: return None
    if not path_parts: return None
    head, *rest = path_parts
    if head not in node['files']: return None
    sub = node['files'][head]
    if not rest:
        if 'data' in sub: return sub['data']
        return None
    if 'files' in sub:
        return find_data(sub, rest)
    return None

idx = find_data(j, ['src', 'index.html'])
if idx:
    print(base64.b64decode(idx).decode('utf-8'))
else:
    print('NÃO ENCONTRADO')
