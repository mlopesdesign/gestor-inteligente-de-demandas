@echo off
taskkill /F /IM emulator.exe 2>nul
taskkill /F /IM qemu-system-x86_64.exe 2>nul
echo KILLED
