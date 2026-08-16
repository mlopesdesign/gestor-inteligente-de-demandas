import json, base64, sys
with open(r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu', 'rb') as f:
    data = f.read()
sys.stderr.write(f"len(data)={len(data)}\n")
start = data.find(b'{"files"')
sys.stderr.write(f"start={start}\n")
if start < 0:
    sys.exit(1)
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
sys.stderr.write(f"end={end}\n")
js = data[start:end].decode('utf-8', errors='replace')
j = json.loads(js)
sys.stderr.write("json loaded\n")

def find_in(node, path_parts):
    if 'files' not in node: return None
    if not path_parts: return None
    head, *rest = path_parts
    if head not in node['files']: return None
    sub = node['files'][head]
    if not rest:
        if 'data' in sub: return sub['data']
        return None
    return find_in(sub, rest) if 'files' in sub else None

idx_data = find_in(j, ['src', 'index.html'])
sys.stderr.write(f"idx_data={'yes' if idx_data else 'no'}\n")
if idx_data:
    raw = base64.b64decode(idx_data)
    sys.stdout.write(raw.decode('utf-8'))
    sys.stdout.write("\n")
