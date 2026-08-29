@echo off
setlocal
set ADB="A:\AI\sdk\android\platform-tools\adb.exe"
echo === adb devices ===
%ADB% devices
echo.
echo === processo emulator.exe ===
tasklist /FI "IMAGENAME eq emulator.exe" 2>nul
echo.
echo === processo qemu ===
tasklist /FI "IMAGENAME eq qemu-system-x86_64.exe" 2>nul
echo.
echo === log do emulador (ultimas 30 linhas) ===
set EMULATOR_DIR="A:\AI\sdk\android\emulator"
if exist %EMULATOR_DIR% (echo existe)
dir /B %EMULATOR_DIR% 2>nul | findstr /I "log" 2>nul
