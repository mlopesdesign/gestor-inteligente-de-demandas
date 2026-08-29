@echo off
setlocal
REM Matar tudo do emulador
taskkill /F /IM emulator.exe 2>nul
taskkill /F /IM qemu-system-x86_64.exe 2>nul
taskkill /F /IM qemu-system-x86_64-headle 2>nul
echo Emuladores mortos.

REM Restaurar build/ se quiser (nao eh necessario, build recria)
REM rmdir /S /Q "E:\Projetos\LOPES FOCUS\android-app\app\build" 2>nul
REM ren "E:\Projetos\LOPES FOCUS\android-app\app\build.old" "build" 2>nul

echo Estado final.
