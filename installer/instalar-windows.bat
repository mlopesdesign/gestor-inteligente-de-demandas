@echo off
REM ============================================================================
REM instalar-windows.bat - Wrapper para instalar o Gestor sem bloqueio do
REM SmartScreen no PC do usuario.
REM
REM O QUE ESSE SCRIPT FAZ:
REM 1. Baixa o Setup.exe do GitHub Releases (SEMPRE a versao Latest)
REM 2. Remove o "Mark-of-the-Web" (MotW) do .exe via PowerShell (isso
REM    CONVENCE o SmartScreen que o arquivo e' confiavel, ja' que veio
REM    de fonte conhecida)
REM 3. Executa o Setup.exe como administrador
REM
REM COMO O IRMAO DO USUARIO USA:
REM 1. Baixa esse .bat (https://github.com/.../instalar-windows.bat)
REM 2. Clica com botao direito -> "Executar como administrador"
REM 3. Aguarda o instalador abrir (talvez com 1-2 cliques extras pra desbloquear
REM    o proprio PowerShell, ja' que e' a MESMA politica do SmartScreen)
REM ============================================================================

setlocal

echo ============================================================
echo  Gestor Inteligente de Demandas - Instalador Automatico
echo ============================================================
echo.

REM URL do Setup.exe da release Latest (sempre baixa a versao mais nova)
set SETUP_URL=https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/latest/download/GestorInteligenteDeDemandas-Setup.exe
set SETUP_FILE=%TEMP%\GestorInteligenteDeDemandas-Setup.exe

REM 1) Baixa o Setup.exe
echo [1/3] Baixando o instalador do GitHub Releases...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%SETUP_URL%' -OutFile '%SETUP_FILE%' -UseBasicParsing } catch { Write-Host ('ERRO ao baixar: ' + $_.Exception.Message); exit 1 }"
if not exist "%SETUP_FILE%" (
    echo ERRO: instalador nao foi baixado. Verifique sua conexao com a internet.
    pause
    exit /b 1
)
echo      OK: %SETUP_FILE% (%~zSETUP_FILE% bytes)
echo.

REM 2) Remove o Mark-of-the-Web (MotW) via PowerShell Unblock-File
echo [2/3] Removendo bloqueio do SmartScreen...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Unblock-File -Path '%SETUP_FILE%' -ErrorAction Stop; Write-Host '      OK: MotW removido' } catch { Write-Host ('      AVISO: ' + $_.Exception.Message) }"
echo.

REM 3) Executa o Setup.exe como administrador
echo [3/3] Iniciando o instalador (como administrador)...
echo      Siga as instrucoes na tela do instalador NSIS.
echo.
start "" /wait "%SETUP_FILE%"
set RC=%ERRORLEVEL%
echo.
if %RC% NEQ 0 (
    echo O instalador retornou codigo de erro: %RC%
    echo Se o Windows bloqueou, clique "Mais informacoes" -^> "Executar mesmo assim".
    pause
)
endlocal
exit /b %RC%
