@echo off
setlocal
set ADB="A:\AI\sdk\android\platform-tools\adb.exe"
for /L %%i in (1,1,24) do (
  timeout /t 5 /nobreak >nul
  for /f "tokens=*" %%l in ('%ADB% devices ^| findstr /R "device$"') do (
    echo [%%i] ONLINE: %%l
    %ADB% shell getprop ro.product.model
    %ADB% shell getprop ro.build.version.release
    exit /b 0
  )
  echo [%%i] ainda subindo...
)
echo TIMEOUT após 2min
exit /b 1
