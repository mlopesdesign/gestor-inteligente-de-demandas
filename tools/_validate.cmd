@echo off
setlocal
set "JAVA_HOME=A:\AI\sdk\jdk-17\jdk-17.0.20.1+1"
cd /d "E:\Projetos\LOPES FOCUS\android-app"
echo === UNIT TESTS + LINT === > "E:\Projetos\LOPES FOCUS\tools\_validate.log"
gradlew.bat --no-daemon testDebugUnitTest lintDebug >> "E:\Projetos\LOPES FOCUS\tools\_validate.log" 2>&1
echo EXITCODE=%ERRORLEVEL% >> "E:\Projetos\LOPES FOCUS\tools\_validate.log"
