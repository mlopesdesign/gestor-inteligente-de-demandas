import json, sys
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

def find_leaf(node, parts):
    if 'files' not in node: return None
    if not parts: return None
    head, *rest = parts
    if head not in node['files']: return None
    sub = node['files'][head]
    if not rest:
        return sub
    if 'files' in sub:
        return find_leaf(sub, rest)
    return None

leaf = find_leaf(j, ['src', 'resources', 'images', 'logo-icon.png'])
print('leaf:', leaf)
print()
print('tamanho do data neu:', len(data))
print('offset:', leaf.get('offset'))
print('size:', leaf.get('size'))
print('integrity:', leaf.get('integrity'))
print('keys:', list(leaf.keys()))
