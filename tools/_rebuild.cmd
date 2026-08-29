@echo off
setlocal
set "JAVA_HOME=A:\AI\sdk\jdk-17\jdk-17.0.20.1+1"
cd /d "E:\Projetos\LOPES FOCUS\android-app"
gradlew.bat --no-daemon --rerun-tasks assembleDebug > "E:\Projetos\LOPES FOCUS\tools\_rebuild.log" 2>&1
echo EXITCODE=%ERRORLEVEL% >> "E:\Projetos\LOPES FOCUS\tools\_rebuild.log"
