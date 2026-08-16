import json
import sys

with open(sys.argv[1], 'rb') as f:
    data = f.read()

# Acha o JSON
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
for p in ['neutralino.config.json']:
    n = n['files'][p]

offset = int(n['offset'])
size = int(n['size'])
content = binary[offset:offset+size]

# Salva em arquivo
with open(r'E:\Projetos\LOPES FOCUS\docs\config-extraido.json', 'wb') as f:
    f.write(content)
print(f'saved {len(content)} bytes to docs/config-extraido.json')

# Compara com source
with open(r'E:\Projetos\LOPES FOCUS\neutralino.config.json', 'rb') as f:
    src = f.read()
with open(r'E:\Projetos\LOPES FOCUS\docs\config-source.json', 'wb') as f:
    f.write(src)
print(f'saved {len(src)} bytes (source) to docs/config-source.json')
print(f'CONTEUDO == SOURCE: {content == src}')
