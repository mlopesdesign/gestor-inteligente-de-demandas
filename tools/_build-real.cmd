@echo off
setlocal
cd /d "E:\Projetos\LOPES FOCUS\android-app"
gradlew.bat --stop >nul 2>&1
gradlew.bat --no-daemon assembleDebug > "E:\Projetos\LOPES FOCUS\tools\_build-real.log" 2>&1
echo EXITCODE=%ERRORLEVEL% >> "E:\Projetos\LOPES FOCUS\tools\_build-real.log"
