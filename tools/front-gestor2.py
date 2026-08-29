#!/usr/bin/env python3
"""Minimiza TODAS as janelas maximizadas e traz o Gestor pra frente."""
import ctypes
import ctypes.wintypes
import subprocess
import time
import re

user32 = ctypes.windll.user32

SW_MINIMIZE = 6
SW_RESTORE = 9
SW_SHOWMINIMIZED = 2

# Enumera todas as janelas visíveis e minimiza as maximizadas, exceto o Gestor
EnumWindowsProc = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)

def enum_callback(hwnd, lParam):
    # Pega o titulo
    length = user32.GetWindowTextLengthW(hwnd)
    if length == 0:
        return True
    buff = ctypes.create_unicode_buffer(length + 1)
    user32.GetWindowTextW(hwnd, buff, length + 1)
    title = buff.value
    # Ignora janelas sem titulo
    if not title.strip():
        return True
    # Pega estado (maximizada?)
    isZoomed = user32.IsZoomed(hwnd)
    isVisible = user32.IsWindowVisible(hwnd)
    if isVisible and isZoomed and 'Gestor' not in title and 'mlopes' not in title.lower():
        # Minimiza
        print(f'minimizando: {title}')
        user32.ShowWindow(hwnd, SW_MINIMIZE)
    return True

user32.EnumWindows(EnumWindowsProc(enum_callback), 0)
time.sleep(1)

# Traz o Gestor
result = subprocess.run(['powershell', '-Command',
    "Get-Process -Name 'GestorInteligenteDeDemandas' -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*Program Files*' } | Select-Object MainWindowHandle | Format-List"],
    capture_output=True, text=True)
print('Gestor lookup:', result.stdout)
m = re.search(r'MainWindowHandle\s*:\s*(\d+)', result.stdout)
if m:
    hwnd = int(m.group(1))
    print(f'trazendo hwnd {hwnd} pra frente')
    user32.ShowWindow(hwnd, SW_RESTORE)
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
    "$bmp.Save('E:\\Projetos\\LOPES FOCUS\\tools\\screen-gestor-final.png', [System.Drawing.Imaging.ImageFormat]::Png); "
    "$g.Dispose(); $bmp.Dispose()"
], check=True)
print('print salvo em screen-gestor-final.png')
