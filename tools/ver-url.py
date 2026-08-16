import json
import sys

with open(sys.argv[1], 'rb') as f:
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
# Parse como filesystem
# O JSON tem {"files": {...}} mas nao tem 'url' no top level
# Vou procurar pelo 'url' no JSON
import re
urls = re.findall(r'"url":\s*"([^"]+)"', js)
print('urls found:', urls)
