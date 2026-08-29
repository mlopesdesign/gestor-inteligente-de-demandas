@echo off
cd /d "A:\AI\sdk\android\emulator"
start "AI_API35" /MIN emulator.exe -avd AI_API35 -no-snapshot -no-audio -no-boot-anim -gpu swiftshader_indirect -accel off -no-window 1>"E:\Projetos\LOPES FOCUS\tools\_emu.log" 2>&1
echo LAUNCHED
