# tools/build-setup.ps1 - compila o Setup.exe via NSIS
# Pre-requisito: tools/nsis-3.10/ com makensis.exe
#
# Uso:  powershell -File tools\build-setup.ps1
# Saida: installer\GestorInteligenteDeDemandas-Setup-<versao>.exe (versao do .nsi)

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
# O mesmo vale para arquivos de texto embarcados (LICENSE.txt, LEIA-ME.txt) que o
# instalador exibe (MUI_PAGE_LICENSE, MUI_FINISHPAGE_SHOWREADME). PT-BR (á é ç ã õ)
# cabe 100% em CP1252, sem perda.
function Convert-Utf8ToCp1252([string]$Path) {
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $temUtf8 = $false
    for ($i = 0; $i -lt $bytes.Length - 1; $i++) {
        if ($bytes[$i] -ge 0xC0 -and $bytes[$i+1] -ge 0x80) { $temUtf8 = $true; break }
    }
    if ($temUtf8) {
        Write-Output "[build-setup] convertendo para CP1252: $([System.IO.Path]::GetFileName($Path))" -ForegroundColor Yellow
        $texto = [System.Text.Encoding]::UTF8.GetString($bytes)
        $cp1252 = [System.Text.Encoding]::GetEncoding(1252)
        [System.IO.File]::WriteAllBytes($Path, $cp1252.GetBytes($texto))
    }
}
Convert-Utf8ToCp1252 (Join-Path $installer 'gestor.nsi')
Convert-Utf8ToCp1252 (Join-Path $installer 'LICENSE.txt')
$leiaMe = Join-Path $installer 'LEIA-ME.txt'
if (Test-Path $leiaMe) { Convert-Utf8ToCp1252 $leiaMe }

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

# Detecta versao do nsi (APP_VERSION) pra montar o nome do Setup.exe
$nsiText = Get-Content (Join-Path $installer 'gestor.nsi') -Raw
$ver = if ($nsiText -match 'APP_VERSION\s+"([0-9]+\.[0-9]+\.[0-9]+)"') { $matches[1] } else { '0.0.0' }
$setupExe = Join-Path $installer "GestorInteligenteDeDemandas-Setup-$ver.exe"
if (Test-Path $setupExe) {
    $size = (Get-Item $setupExe).Length
    Write-Output ""
    Write-Output "[build-setup] OK: $setupExe ($([math]::Round($size/1MB,1)) MB)" -ForegroundColor Green
} else {
    throw "Setup.exe nao foi gerado em $setupExe"
}
