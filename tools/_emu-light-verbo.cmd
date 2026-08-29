@echo off
cd /d "A:\AI\sdk\android\emulator"
emulator.exe -avd GestorLight -no-snapshot -no-audio -no-boot-anim -no-window -accel off -gpu swiftshader_indirect -memory 1024 -cores 2 -verbose 1>"E:\Projetos\LOPES FOCUS\tools\_emu-light-v.log" 2>&1
