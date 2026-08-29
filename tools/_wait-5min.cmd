@echo off
setlocal
set ADB="A:\AI\sdk\android\platform-tools\adb.exe"
set LOG="E:\Projetos\LOPES FOCUS\tools\_emu3-wait2.log"
echo Waiting for emulator (5 min more)... > %LOG%
for /L %%i in (1,1,30) do (
  timeout /t 10 /nobreak >nul
  for /f "tokens=*" %%l in ('%ADB% devices 2^>nul') do (
    echo %%i: %%l >> %LOG%
  )
)
type %LOG%
