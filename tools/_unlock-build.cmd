@echo off
setlocal
set ROOT=E:\Projetos\LOPES FOCUS\android-app
if exist "%ROOT%\app\build\generated" (
  move "%ROOT%\app\build\generated" "%ROOT%\app\build\generated.v3" >nul 2>&1
  echo generated -> .v3
)
if exist "%ROOT%\app\build\intermediates" (
  move "%ROOT%\app\build\intermediates" "%ROOT%\app\build\intermediates.v3" >nul 2>&1
  echo intermediates -> .v3
)
if exist "%ROOT%\app\build\tmp" (
  move "%ROOT%\app\build\tmp" "%ROOT%\app\build\tmp.v3" >nul 2>&1
  echo tmp -> .v3
)
echo DONE
