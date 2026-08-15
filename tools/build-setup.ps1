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

# IMPORTANTE: makensis le o .nsi como ANSI/CP1252. Se estiver em UTF-8, acentos viram 'Ã©'
# (ex: "Função" aparece como "FunÃ§Ã£o" no instalador). Converter antes de compilar.
# PT-BR (á é ç ã õ etc) cabe 100% em CP1252, sem perda.
$nsiPath = Join-Path $installer 'gestor.nsi'
$nsiBytes = [System.IO.File]::ReadAllBytes($nsiPath)
# Heuristica: se tem bytes UTF-8 multibyte (>= 0x80 seguidos de >= 0x80), converte
$temUtf8 = $false
for ($i = 0; $i -lt $nsiBytes.Length - 1; $i++) {
    if ($nsiBytes[$i] -ge 0xC0 -and $nsiBytes[$i+1] -ge 0x80) { $temUtf8 = $true; break }
}
if ($temUtf8) {
    Write-Output "[build-setup] gestor.nsi em UTF-8, convertendo para CP1252 antes de makensis..." -ForegroundColor Yellow
    $texto = [System.Text.Encoding]::UTF8.GetString($nsiBytes)
    $cp1252 = [System.Text.Encoding]::GetEncoding(1252)
    [System.IO.File]::WriteAllBytes($nsiPath, $cp1252.GetBytes($texto))
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
