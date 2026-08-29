@echo off
cd /d "A:\AI\sdk\android\emulator"
start "AI_API35-sw" /MIN emulator.exe -avd AI_API35 -no-snapshot -no-audio -no-boot-anim -no-window -accel off -gpu swiftshader_indirect -netdelay none -netspeed full 1>"E:\Projetos\LOPES FOCUS\tools\_emu3.log" 2>&1
echo LAUNCHED
