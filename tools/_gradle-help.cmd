@echo off
cd /d "E:\Projetos\LOPES FOCUS\android-app"
gradlew.bat --no-daemon help > "E:\Projetos\LOPES FOCUS\tools\_gradle-help.log" 2>&1
echo EXITCODE=%ERRORLEVEL% >> "E:\Projetos\LOPES FOCUS\tools\_gradle-help.log"
