@echo off
setlocal
set ROOT=E:\Projetos\LOPES FOCUS\android-app
set BUILD=%ROOT%\app\build
if exist "%BUILD%" (
  echo Movendo %BUILD% para .old ...
  move "%BUILD%" "%BUILD%.old" >nul 2>&1
  if exist "%BUILD%.old" echo OK movido
) else (
  echo build/ nao existe
)
dir "%ROOT%\app" /B | findstr "build"
