@echo off
cd /d "A:\AI\sdk\android\emulator"
start "GestorArm-sw" /MIN emulator.exe -avd GestorArm -no-snapshot -no-audio -no-boot-anim -no-window -gpu swiftshader_indirect -netdelay none -netspeed full 1>"E:\Projetos\LOPES FOCUS\tools\_emu-arm.log" 2>&1
echo LAUNCHED
