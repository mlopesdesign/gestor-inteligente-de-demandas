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

def walk(node, prefix=''):
    items = []
    for k, v in node.get('files', {}).items():
        path = prefix + '/' + k if prefix else k
        if 'files' in v and 'size' not in v:
            items.extend(walk(v, path))
        else:
            items.append((path, int(v['size']), int(v['offset'])))
    return items

files = walk(j)
for path, size, off in files:
    print(f'{path:50}  size={size:>6}  offset={off:>8}')
