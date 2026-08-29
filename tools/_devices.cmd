@echo off
setlocal
cd /d "A:\AI\sdk\android\platform-tools"
adb devices > "E:\Projetos\LOPES FOCUS\tools\_adb-devices.log" 2>&1
echo --- >> "E:\Projetos\LOPES FOCUS\tools\_adb-devices.log"
adb shell getprop ro.product.model >> "E:\Projetos\LOPES FOCUS\tools\_adb-devices.log" 2>&1
adb shell getprop ro.build.version.release >> "E:\Projetos\LOPES FOCUS\tools\_adb-devices.log" 2>&1
