import sys
import os

path = sys.argv[1] if len(sys.argv) > 1 else r'E:\Projetos\LOPES FOCUS\dist\resources.neu'
with open(path, 'rb') as f:
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
# Pega o tamanho do config do JSON
import json
js = data[start:end].decode('utf-8')
j = json.loads(js)
config_size = int(j['files']['neutralino.config.json']['size'])
config = binary[0:config_size]
print(f'extraido len: {len(config)}')
print(f'extraido[200:300]: {config[200:300]!r}')
print()
with open(r'E:\Projetos\LOPES FOCUS\neutralino.config.json', 'rb') as f:
    src = f.read()
print(f'src len: {len(src)}')
print(f'src[200:300]: {src[200:300]!r}')
print()
print(f'configs iguais: {config == src}')
print(f'extraido[200:230] == src[200:230]: {config[200:230] == src[200:230]}')
