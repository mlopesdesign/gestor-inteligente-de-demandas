#!/usr/bin/env python3
"""Forca o Gestor pra frente e tira print"""
import ctypes
import ctypes.wintypes
import time

user32 = ctypes.windll.user32

SW_RESTORE = 9
HWND_TOP = 0
SWP_NOMOVE = 0x0002
SWP_NOSIZE = 0x0001

hwnd = 0x00575B66  # 5721446 = 0x575B66
# Show + restore + setforeground
user32.ShowWindow(hwnd, SW_RESTORE)
user32.SetForegroundWindow(hwnd)
time.sleep(1)

# Print screen
import subprocess
subprocess.run(['powershell', '-Command',
    "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; "
    "$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; "
    "$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height; "
    "$g = [System.Drawing.Graphics]::FromImage($bmp); "
    "$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size); "
    "$bmp.Save('E:\\Projetos\\LOPES FOCUS\\tools\\screen-gestor.png', [System.Drawing.Imaging.ImageFormat]::Png); "
    "$g.Dispose(); $bmp.Dispose()"
], check=True)
print('print salvo')
