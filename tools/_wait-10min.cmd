@echo off
setlocal
set ADB="A:\AI\sdk\android\platform-tools\adb.exe"
set LOG="E:\Projetos\LOPES FOCUS\tools\_emu-arm-wait2.log"
echo Waiting 10 min for qemu-system-x86_64-headless to boot... > %LOG%
for /L %%i in (1,1,60) do (
  timeout /t 10 /nobreak >nul
  for /f "tokens=*" %%l in ('%ADB% devices 2^>nul') do (
    echo %%i: %%l >> %LOG%
  )
  REM checa se subiu
  for /f "tokens=*" %%l in ('%ADB% devices 2^>nul ^| findstr /R "emulator-.*device"') do (
    echo ONLINE! %%l >> %LOG%
    exit /b 0
  )
)
type %LOG%
