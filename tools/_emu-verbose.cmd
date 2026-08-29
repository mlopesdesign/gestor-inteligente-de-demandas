@echo off
cd /d "A:\AI\sdk\android\emulator"
emulator.exe -avd AI_API35 -no-snapshot -no-audio -no-boot-anim -no-window -accel off -gpu swiftshader_indirect -verbose 1>"E:\Projetos\LOPES FOCUS\tools\_emu-verbose.log" 2>&1
