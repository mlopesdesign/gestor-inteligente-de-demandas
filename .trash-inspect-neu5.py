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
src = j['files']['src']
print("src keys:", list(src.keys())[:5])
print("src has 'files'?", 'files' in src)
print("src has 'data'?", 'data' in src)
# dump primeiros bytes da index.html
if 'files' in src:
    print("src.files keys:", list(src['files'].keys())[:5])
    if 'index.html' in src['files']:
        leaf = src['files']['index.html']
        print("leaf keys:", list(leaf.keys())[:10])
        print("first 200 bytes of data:", base64.b64decode(leaf['data'])[:200].decode('utf-8', errors='replace'))
