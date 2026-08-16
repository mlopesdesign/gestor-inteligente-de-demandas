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

js = data[start:end].decode('utf-8', errors='replace')
j = json.loads(js)
binary = data[end:]

# Acha o arquivo
path = sys.argv[2].split('/')
n = j
for p in path:
    n = n['files'][p]

offset = int(n['offset'])
size = int(n['size'])
print(f'file: {sys.argv[2]}')
print(f'offset: {offset}, size: {size}')
print(f'binary len: {len(binary)}')
print(f'expected end: {offset + size}')

content = binary[offset:offset+size]
print(f'--- first 200 bytes ---')
sys.stdout.buffer.write(content[:200])
print()
print('--- last 200 bytes ---')
sys.stdout.buffer.write(content[-200:])

# Compara com source
src_path = sys.argv[3] if len(sys.argv) > 3 else None
if src_path:
    with open(src_path, 'rb') as f:
        src = f.read()
    print()
    print(f'--- source first 100 ---')
    sys.stdout.buffer.write(src[:100])
    print()
    print(f'--- source last 100 ---')
    sys.stdout.buffer.write(src[-100:])
    print()
    print(f'match first: {content[:200] == src[:200]}')
    print(f'match last: {content[-200:] == src[-200:]}')
    print(f'src size: {len(src)}')
