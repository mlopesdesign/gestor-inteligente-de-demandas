import json
import sys

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

js = data[start:end].decode('utf-8', errors='replace')
j = json.loads(js)
binary = data[end:]

# app.js: navega na arvore
n = j
for p in ['src', 'js', 'app.js']:
    n = n['files'][p]
print('app.js decl:', n)
offset = int(n['offset'])
size = int(n['size'])
app_js = binary[offset:offset+size]
print('app.js first 30:', app_js[:30])
print('app.js last 30:', app_js[-30:])

with open(r'E:\Projetos\LOPES FOCUS\src\js\app.js', 'rb') as f:
    src = f.read()
print('src first 30:', src[:30])
print('src last 30:', src[-30:])
print('match first:', app_js[:30] == src[:30])
print('match last:', app_js[-30:] == src[-30:])
