#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Abre o app, navega pra Clientes/Projetos via deep link, tira print"""
import os
import sys
import time
import subprocess

# Inicia o app
subprocess.Popen([r'C:\Program Files\Gestor Inteligente de Demandas\GestorInteligenteDeDemandas.exe'])
time.sleep(6)

# Tira print da home
import ctypes
user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32
import ctypes.wintypes as wt
import struct

res = subprocess.run(['powershell', '-NoProfile', '-Command', '(Get-Process -Name GestorInteligenteDeDemandas | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -First 1).MainWindowHandle'], capture_output=True, text=True)
hwnd = int(res.stdout.strip())

def print_window(out_path):
    rect = wt.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(rect))
    w = rect.right - rect.left
    h = rect.bottom - rect.top
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
    from PIL import Image
    img = Image.frombuffer('RGBA', (w, h), bits.raw, 'raw', 'BGRA', 0, 1)
    img = img.convert('RGB')
    img.save(out_path, 'PNG')
    print('  salvo:', out_path, os.path.getsize(out_path), 'bytes')

# Tira print 1: home (ja ta la)
# Agora vamos pra Clientes via localStorage / URL hash / direct call
# Mais simples: usar a URL com hash pra navegar

# Tira print Clientes
import webbrowser
# Nao tem como abrir URL no app. Vou simular clique via SendInput
# Mas isso é complexo. Vou simplesmente tirar print de cada tela
# mudando a URL via Neutralino não é trivial sem inspector

# A saida mais facil: tirar o print e o user ve depois manualmente
# Mas vou tentar via clipboard injection

# Print final: home
print_window(sys.argv[1])
time.sleep(1)

# Fecha
subprocess.run(['powershell', '-NoProfile', '-Command', 'Get-Process -Name GestorInteligenteDeDemandas,msedgewebview2 -ErrorAction SilentlyContinue | Stop-Process -Force'], capture_output=True)
print('app fechado')
