#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Tira print da janela do app via ctypes"""
import os
import sys
import time
import ctypes
import ctypes.wintypes as wt
import subprocess

# Inicia o app
subprocess.Popen([r'C:\Program Files\Gestor Inteligente de Demandas\GestorInteligenteDeDemandas.exe'])
time.sleep(6)

# Tira print
import ctypes
user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32

def find_window(title):
    res = ctypes.windll.user32.FindWindowW(None, title)
    return res

# Encontra a janela do app
hwnd = None
import subprocess
res = subprocess.run(['powershell', '-NoProfile', '-Command', '(Get-Process -Name GestorInteligenteDeDemandas | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -First 1).MainWindowHandle'], capture_output=True, text=True)
try:
    hwnd = int(res.stdout.strip())
    print('hwnd:', hwnd)
except:
    print('nao achei janela, saindo')
    sys.exit(1)

# Get window rect
rect = wt.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(rect))
w = rect.right - rect.left
h = rect.bottom - rect.top
print(f'janela: {w}x{h} em ({rect.left},{rect.top})')

# Pega o device context
hdc = user32.GetWindowDC(hwnd)
hdc_mem = gdi32.CreateCompatibleDC(hdc)
hbmp = gdi32.CreateCompatibleBitmap(hdc, w, h)
gdi32.SelectObject(hdc_mem, hbmp)

# PrintWindow com PW_RENDERFULLCONTENT (=2)
user32.PrintWindow(hwnd, hdc_mem, 2)

# Salva como PNG
out = sys.argv[1] if len(sys.argv) > 1 else r'E:\Projetos\LOPES FOCUS\docs\VALIDACAO-v0.2.17-app.png'

# Pega os bits
bmpinfo = ctypes.create_string_buffer(40)
ctypes.memset(bmpinfo, 0, 40)
import struct
struct.pack_into('<IiiHHIIiiII', bmpinfo, 0, 40, w, -h, 1, 32, 0, w*h*4, 0, 0, 0, 0)
bits = ctypes.create_string_buffer(w*h*4)
gdi32.GetDIBits(hdc_mem, hbmp, 0, h, bits, bmpinfo, 0)
gdi32.DeleteObject(hbmp)
gdi32.DeleteDC(hdc_mem)
user32.ReleaseDC(hwnd, hdc)

# Converte pra PNG com Pillow se disponível
try:
    from PIL import Image
    img = Image.frombuffer('RGBA', (w, h), bits.raw, 'raw', 'BGRA', 0, 1)
    img = img.convert('RGB')
    img.save(out, 'PNG')
    print('salvo:', out, os.path.getsize(out), 'bytes')
except ImportError:
    # Fallback: BMP
    out_bmp = out.replace('.png', '.bmp')
    with open(out_bmp, 'wb') as f:
        # BITMAPFILEHEADER
        f.write(b'BM')
        f.write(struct.pack('<I', 54 + w*h*4))
        f.write(b'\x00\x00\x00\x00')
        f.write(struct.pack('<I', 54))
        f.write(bmpinfo.raw[:40])
        f.write(bits.raw)
    print('salvo BMP:', out_bmp)

# Fecha o app
time.sleep(1)
subprocess.run(['powershell', '-NoProfile', '-Command', 'Get-Process -Name GestorInteligenteDeDemandas,msedgewebview2 -ErrorAction SilentlyContinue | Stop-Process -Force'], capture_output=True)
print('app fechado')
