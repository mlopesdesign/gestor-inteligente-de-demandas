import json
import sys

for path in [r'E:\Projetos\LOPES FOCUS\dist\resources-neu-original.neu', r'E:\Projetos\LOPES FOCUS\dist\resources.neu']:
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
    js = data[start:end].decode('utf-8')
    j = json.loads(js)
    print(f'== {path} ==')
    print('keys:', list(j.keys()))
    print('files count:', len(j.get('files', {})))
    if 'files' in j:
        for k, v in j['files'].items():
            if 'size' in v:
                print(f'  {k}: size={v["size"]} offset={v["offset"]}')
            else:
                print(f'  {k}/ (dir)')
                for k2, v2 in v.get('files', {}).items():
                    print(f'    {k2}: size={v2.get("size","?")} offset={v2.get("offset","?")}')
    print()
