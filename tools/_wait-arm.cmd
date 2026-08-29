@echo off
setlocal
set ADB="A:\AI\sdk\android\platform-tools\adb.exe"
set LOG="E:\Projetos\LOPES FOCUS\tools\_emu-arm-wait.log"
echo Waiting for GestorArm (4 min)... > %LOG%
for /L %%i in (1,1,24) do (
  timeout /t 10 /nobreak >nul
  for /f "tokens=*" %%l in ('%ADB% devices 2^>nul') do (
    echo %%i: %%l >> %LOG%
  )
)
type %LOG%
