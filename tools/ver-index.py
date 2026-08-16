import json
import sys

with open(r'E:\Projetos\LOPES FOCUS\dist\resources-neu-original.neu', 'rb') as f:
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
n = j['files']['src']['files']['index.html']
offset = int(n['offset'])
size = int(n['size'])
print(f'index.html: size={size} offset={offset}')

# Pega o conteudo
content = binary[offset:offset+size]
print(f'content len: {len(content)}')
print(f'first 100: {content[:100]!r}')
print(f'last 100: {content[-100:]!r}')

# Compara com source
with open(r'E:\Projetos\LOPES FOCUS\src\index.html', 'rb') as f:
    src = f.read()
print(f'src len: {len(src)}')
print(f'src first 100: {src[:100]!r}')
print(f'src last 100: {src[-100:]!r}')
print(f'match first 100: {content[:100] == src[:100]}')
print(f'match last 100: {content[-100:] == src[-100:]}')
