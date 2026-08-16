import json

with open(r'E:\Projetos\LOPES FOCUS\dist\resources.neu', 'rb') as f:
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
config = binary[0:1868]
print('Tamanho extraido:', len(config))

with open(r'E:\Projetos\LOPES FOCUS\neutralino.config.json', 'rb') as f:
    src = f.read()
print('Tamanho source:', len(src))
print('Sao iguais:', config == src)
if config != src:
    for i in range(min(len(config), len(src))):
        if config[i] != src[i]:
            print(f'Primeira diferenca em offset {i}:')
            print(f'  extraido: {config[max(0,i-20):i+30]!r}')
            print(f'  source:   {src[max(0,i-20):i+30]!r}')
            break
