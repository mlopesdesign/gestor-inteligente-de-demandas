import json
import sys

with open(sys.argv[1] if len(sys.argv) > 1 else r'E:\Projetos\LOPES FOCUS\dist\resources.neu', 'rb') as f:
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

js = data[start:end].decode('utf-8')
j = json.loads(js)
n = j['files']['neutralino.config.json']
print(f'JSON diz: size={n["size"]} offset={n["offset"]}')

# Verifica o src
with open(r'E:\Projetos\LOPES FOCUS\neutralino.config.json', 'rb') as f:
    src = f.read()
print(f'src len: {len(src)}')

# Verifica o que tem no offset
binary = data[end:]
content = binary[int(n['offset']):int(n['offset'])+int(n['size'])]
print(f'content len: {len(content)}')
print(f'content[200:300]: {content[200:300]!r}')
