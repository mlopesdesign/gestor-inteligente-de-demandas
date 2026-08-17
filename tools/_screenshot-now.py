#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Tira screenshot via ctypes puro"""
import sys
import ctypes
import ctypes.wintypes as wt
import struct
import subprocess
import time

# Find hwnd
res = subprocess.run(['powershell', '-NoProfile', '-Command',
    "(Get-Process -Name GestorInteligenteDeDemandas -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object -First 1).MainWindowHandle"],
    capture_output=True, text=True)
hwnd = int(res.stdout.strip())
print('hwnd:', hwnd)

user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32
rect = wt.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(rect))
w = rect.right - rect.left
h = rect.bottom - rect.top
print('size:', w, 'x', h)

hdc = user32.GetWindowDC(hwnd)
hdc_mem = gdi32.CreateCompatibleDC(hdc)
hbmp = gdi32.CreateCompatibleBitmap(hdc, w, h)
gdi32.SelectObject(hdc_mem, hbmp)
user32.PrintWindow(hwnd, hdc_mem, 2)

bmpinfo = ctypes.create_string_buffer(40)
ctypes.memset(bmpinfo, 0, 40)
struct.pack_into('<IiiHHIIiiII', bmpinfo, 0, 40, w, -h, 1, 32, 0, w*h*4, 0, 0, 0, 0)
bits = ctypes.create_string_buffer(w*h*4)
gdi32.GetDIBits(hdc_mem, hbmp, 0, h, bits, bmpinfo, 0)
gdi32.DeleteObject(hbmp)
gdi32.DeleteDC(hdc_mem)
user32.ReleaseDC(hwnd, hdc)

out = sys.argv[1]
from PIL import Image
img = Image.frombuffer('RGBA', (w, h), bits.raw, 'raw', 'BGRA', 0, 1)
img = img.convert('RGB')
img.save(out, 'PNG')
print('salvo:', out)

subprocess.run(['powershell', '-NoProfile', '-Command',
    'Get-Process -Name GestorInteligenteDeDemandas,msedgewebview2 -ErrorAction SilentlyContinue | Stop-Process -Force'],
    capture_output=True)
print('app fechado')
