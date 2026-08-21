#!/usr/bin/env python3
"""Trazer a janela do Gestor pra frente"""
import ctypes
import ctypes.wintypes
import subprocess
import time
import os

user32 = ctypes.windll.user32

# Acha PID do Gestor
result = subprocess.run(['powershell', '-Command',
    "Get-Process -Name 'GestorInteligenteDeDemandas' | Select-Object Id, MainWindowHandle | Format-List"],
    capture_output=True, text=True)
print(result.stdout)
