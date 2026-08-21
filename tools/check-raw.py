#!/usr/bin/env python3
with open(r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu', 'rb') as f:
    data = f.read()
print('First 50 bytes (hex):')
print(' '.join(f'{b:02x}' for b in data[:50]))
print()
print('First 50 bytes (ascii):')
print(data[:50])
print()
# Onde o JSON comeca?
idx = data.find(b'{"fi')
print(f'JSON starts at offset: {idx}')
print(f'JSON first 80 bytes: {data[idx:idx+80]}')
