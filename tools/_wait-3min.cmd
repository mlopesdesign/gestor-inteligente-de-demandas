@echo off
setlocal
set ADB="A:\AI\sdk\android\platform-tools\adb.exe"
set LOG="E:\Projetos\LOPES FOCUS\tools\_emu3-wait.log"
echo Waiting for emulator (3 min)... > %LOG%
for /L %%i in (1,1,18) do (
  timeout /t 10 /nobreak >nul
  for /f "tokens=*" %%l in ('%ADB% devices 2^>nul') do (
    echo %%i: %%l >> %LOG%
  )
)
type %LOG%
