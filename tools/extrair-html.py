import json

with open(r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu', 'rb') as f:
    data = f.read()
start = data.find(b'{"files"')
i = start
depth = 0
end = -1
in_string = False
escape = False
while i < len(data):
    c = data[i:i+1]
    b = c[0]
    if escape:
        escape = False
    elif b == 0x5c:
        escape = True
    elif b == 0x22:
        in_string = not in_string
    elif not in_string:
        if b == 0x7b:
            depth += 1
        elif b == 0x7d:
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    i += 1

binary = data[end:]
j = json.loads(data[start:end].decode('utf-8'))
n = j
for p in ['src', 'index.html']:
    n = n['files'][p]
offset = int(n['offset'])
size = int(n['size'])
html = binary[offset:offset+size]
print(html.decode('utf-8', errors='replace'))
