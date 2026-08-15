import json
with open(r'C:\Program Files\Gestor Inteligente de Demandas\resources.neu', 'rb') as f:
    data = f.read()
start = data.find(b'{"files"')
i = start
depth = 0
end = -1
in_string = False
escape = False
while i < len(data):
    c = data[i]
    if escape: escape = False
    elif c == ord('\\'): escape = True
    elif c == ord('"'): in_string = not in_string
    elif not in_string:
        if c == ord('{'): depth += 1
        elif c == ord('}'):
            depth -= 1
            if depth == 0: end = i + 1; break
    i += 1
js = data[start:end].decode('utf-8', errors='replace')
j = json.loads(js)

def walk(node, prefix=''):
    if 'files' not in node: return
    for k, v in node['files'].items():
        path = prefix + '/' + k if prefix else k
        if 'files' in v and 'size' not in v:
            walk(v, path)
        else:
            print(f'  {path}  ({v.get("size", "?")} bytes)')

walk(j)
print('---total arquivos:', sum(1 for _ in [None]))
