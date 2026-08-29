@echo off
setlocal
set ADB="A:\AI\sdk\android\platform-tools\adb.exe"
set LOG="E:\Projetos\LOPES FOCUS\tools\_emu-wait.log"
echo Waiting for emulator... > %LOG%
for /L %%i in (1,1,30) do (
  timeout /t 10 /nobreak >nul
  for /f "tokens=*" %%l in ('%ADB% devices 2^>nul ^| findstr /R "emulator-"') do (
    echo [%%i*10s] FOUND: %%l >> %LOG%
    %ADB% -s %%l shell getprop ro.product.model 2>nul >> %LOG%
    %ADB% -s %%l shell getprop ro.build.version.release 2>nul >> %LOG%
    echo DONE >> %LOG%
    exit /b 0
  )
  echo [%%i*10s] still waiting... >> %LOG%
  if exist "A:\AI\sdk\android\emulator\emu-crash-*.log" (
    echo CRASH DETECTED >> %LOG%
    dir "A:\AI\sdk\android\emulator\emu-crash-*.log" >> %LOG%
  )
)
echo TIMEOUT 5min >> %LOG%
exit /b 1
