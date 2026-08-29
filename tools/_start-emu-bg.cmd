@echo off
cd /d "A:\AI\sdk\android\emulator"
start "AI_API35" /MIN emulator.exe -avd AI_API35 -no-snapshot -no-audio -no-boot-anim -no-window -accel off -gpu swiftshader_indirect -memory 2048 -cores 4 1>"E:\Projetos\LOPES FOCUS\tools\_emu-bg.log" 2>&1
echo LAUNCHED
