#!/usr/bin/env python3
"""Maximiza a janela do Gestor via PID."""
import ctypes
import ctypes.wintypes
import subprocess
import time
import re

user32 = ctypes.windll.user32

SW_SHOWMAXIMIZED = 3
SW_RESTORE = 9

# Pega o Gestor em C:\Program Files
result = subprocess.run(['powershell', '-Command',
    "Get-Process -Name 'GestorInteligenteDeDemandas' -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*Program Files*' } | Select-Object Id, MainWindowHandle, MainWindowTitle | Format-List"],
    capture_output=True, text=True)
print('Gestor lookup:', result.stdout)

m = re.search(r'MainWindowHandle\s*:\s*(\d+)', result.stdout)
if not m:
    print('Gestor nao encontrado')
    raise SystemExit(1)
hwnd = int(m.group(1))
print(f'hwnd: {hwnd}')

# Maximiza e traz pra frente
user32.ShowWindow(hwnd, SW_SHOWMAXIMIZED)
user32.SetForegroundWindow(hwnd)
user32.BringWindowToTop(hwnd)
time.sleep(2)

# Print
subprocess.run(['powershell', '-Command',
    "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; "
    "$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; "
    "$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height; "
    "$g = [System.Drawing.Graphics]::FromImage($bmp); "
    "$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size); "
    "$bmp.Save('E:\\Projetos\\LOPES FOCUS\\tools\\screen-gestor-max.png', [System.Drawing.Imaging.ImageFormat]::Png); "
    "$g.Dispose(); $bmp.Dispose()"
], check=True)
print('print salvo em screen-gestor-max.png')
