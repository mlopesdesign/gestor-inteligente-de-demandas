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
print(list(j.keys()))
print(list(j['files'].keys())[:5] if 'files' in j else 'no files key')
print('src' in j['files'])
print(list(j['files']['src'].keys())[:5] if 'src' in j['files'] else 'no src')
