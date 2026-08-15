# tools/build-setup.ps1 - compila o Setup.exe via NSIS
# Pre-requisito: tools/nsis-3.10/ com makensis.exe
#
# Uso:  powershell -File tools\build-setup.ps1
# Saida: installer\GestorInteligenteDeDemandas-Setup-0.1.0.exe

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$installer = Join-Path $root 'installer'
$nsis = Join-Path $root 'tools\nsis-3.10'
$makensis = Join-Path $nsis 'makensis.exe'

if (-not (Test-Path $makensis)) {
    throw "NSIS nao encontrado em $makensis. Rode: python tools/download-nsis.py"
}

# Garante que LICENSE.txt existe
if (-not (Test-Path (Join-Path $installer 'LICENSE.txt'))) {
    throw "LICENSE.txt nao existe em $installer"
}

# Garante app-image presente
$appImage = Join-Path $root 'dist\GestorInteligenteDeDemandas\GestorInteligenteDeDemandas.exe'
if (-not (Test-Path $appImage)) {
    Write-Output "[build-setup] app-image nao encontrado em $appImage. Rodando build.mjs primeiro..." -ForegroundColor Yellow
    & node tools/build.mjs 2>&1 | Select-Object -Last 5 | ForEach-Object { Write-Output ("  " + $_) }
}

Push-Location $installer
Write-Output "[build-setup] makensis.exe gestor.nsi" -ForegroundColor Cyan
& $makensis /V2 "gestor.nsi" 2>&1 | ForEach-Object { Write-Output ("  " + $_) }
Pop-Location

$setupExe = Join-Path $installer 'GestorInteligenteDeDemandas-Setup-0.1.0.exe'
if (Test-Path $setupExe) {
    $size = (Get-Item $setupExe).Length
    Write-Output ""
    Write-Output "[build-setup] OK: $setupExe ($([math]::Round($size/1MB,1)) MB)" -ForegroundColor Green
} else {
    throw "Setup.exe nao foi gerado em $setupExe"
}
