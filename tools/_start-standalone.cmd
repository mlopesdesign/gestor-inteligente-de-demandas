@echo off
cd /d "A:\AI\sdk\android\emulator"
start "Emulador-AI_API35" /MIN emulator.exe -avd AI_API35 -no-snapshot -no-audio -no-boot-anim -accel off -gpu swiftshader_indirect -memory 2048 -cores 4 1>"E:\Projetos\LOPES FOCUS\tools\_emu-standalone.log" 2>&1
echo LAUNCHED
