import struct
import sys

path = sys.argv[1] if len(sys.argv) > 1 else r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu'
with open(path, 'rb') as f:
    data = f.read()
print(f'size: {len(data)}')
print(f'first 16 bytes hex: {data[:16].hex()}')
print(f'first 4 ints: {struct.unpack("<IIII", data[:16])}')
print(f'JSON start at: {data.find(b"{\"files\"")}')
