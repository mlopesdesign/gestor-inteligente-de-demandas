#!/usr/bin/env python3
"""Trazer a janela do Gestor pra frente e tirar print"""
import ctypes
import ctypes.wintypes
import subprocess
import time

user32 = ctypes.windll.user32

SW_RESTORE = 9

# Acha o Gestor
result = subprocess.run(['powershell', '-Command',
    "Get-Process -Name 'GestorInteligenteDeDemandas' | Select-Object Id, MainWindowHandle | Format-List"],
    capture_output=True, text=True)
print(result.stdout)

# Pega hwnd
import re
m = re.search(r'MainWindowHandle\s*:\s*(\d+)', result.stdout)
if m:
    hwnd = int(m.group(1))
    user32.ShowWindow(hwnd, SW_RESTORE)
    user32.SetForegroundWindow(hwnd)
    time.sleep(2)

# Print
subprocess.run(['powershell', '-Command',
    "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; "
    "$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; "
    "$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height; "
    "$g = [System.Drawing.Graphics]::FromImage($bmp); "
    "$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size); "
    "$bmp.Save('E:\\Projetos\\LOPES FOCUS\\tools\\screen-v0.2.47.png', [System.Drawing.Imaging.ImageFormat]::Png); "
    "$g.Dispose(); $bmp.Dispose()"
], check=True)
print('print salvo em screen-v0.2.47.png')
