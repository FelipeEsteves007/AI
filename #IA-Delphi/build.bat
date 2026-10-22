@echo off
rem Compila o AppImersao (Win32/Debug) e grava a saida em build_log.txt
call "C:\Program Files (x86)\Embarcadero\Studio\37.0\bin\rsvars.bat"
cd /d "%~dp0"
msbuild AppImersao.dproj /t:Build /p:Config=Debug /p:Platform=Win32 /v:minimal > "%~dp0build_log.txt" 2>&1
exit /b %ERRORLEVEL%
