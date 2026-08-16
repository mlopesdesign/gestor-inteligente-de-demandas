import sys

with open(r'E:\Projetos\LOPES FOCUS\dist\resources-neu-original.neu', 'rb') as f:
    data1 = f.read()
with open(r'E:\Projetos\LOPES FOCUS\dist\resources.neu', 'rb') as f:
    data2 = f.read()
print('original first 32 hex:', data1[:32].hex())
print('manual   first 32 hex:', data2[:32].hex())
import struct
print('original first 4 ints:', struct.unpack('<IIII', data1[:16]))
print('manual   first 4 ints:', struct.unpack('<IIII', data2[:16]))

# Acha o JSON
start1 = data1.find(b'{"files"')
start2 = data2.find(b'{"files"')
print('original JSON start:', start1)
print('manual   JSON start:', start2)
print('original size:', len(data1))
print('manual   size:', len(data2))

# Compara a diferenca nos primeiros 16 bytes (header)
print()
print('headers:')
print('  original  0..16:', data1[:16].hex())
print('  manual    0..16:', data2[:16].hex())
