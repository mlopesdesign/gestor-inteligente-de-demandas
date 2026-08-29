@echo off
cd /d "A:\AI\sdk\android\cmdline-tools\latest\bin"
sdkmanager.bat --list 2>&1 | findstr "system-images;android" | findstr /V "Available" | findstr /R "x86_64"
