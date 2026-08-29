@echo off
cd /d "A:\AI\sdk\android\emulator"
start "" /B emulator.exe -avd AI_API35 -no-snapshot -no-audio -no-boot-anim -gpu swiftshader_indirect
echo STARTED
