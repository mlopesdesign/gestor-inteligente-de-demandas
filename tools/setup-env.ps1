# tools/setup-env.ps1
# Configura o ambiente de build do Gestor Inteligente de Demandas.
# Source:  . .\tools\setup-env.ps1
#
# Carrega:
#   - Node.js 22+ (do sistema, ja instalado)
#   - Neutralino SDK portatil (tools/neutralino/)
#   - NSIS portatil (tools/nsis-3.10/)
#   - neu CLI (do npm global, se instalado)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$tools = Join-Path $root 'tools'

# Neutralino SDK
$neuDir = Join-Path $tools 'neutralino'
if (Test-Path $neuDir) {
    $env:Path = "$neuDir;$env:Path"
    Write-Output "[setup-env] Neutralino SDK em: $neuDir" -ForegroundColor Green
} else {
    Write-Output "[setup-env] Neutralino SDK nao encontrado. Rode: node tools/download-neutralino.mjs" -ForegroundColor Yellow
}

# NSIS
$nsisDir = Join-Path $tools 'nsis-3.10'
if (Test-Path (Join-Path $nsisDir 'makensis.exe')) {
    $env:Path = "$nsisDir;$env:Path"
    Write-Output "[setup-env] NSIS em: $nsisDir" -ForegroundColor Green
} else {
    Write-Output "[setup-env] NSIS nao encontrado. Rode: node tools/download-nsis.mjs" -ForegroundColor Yellow
}

# Mostra versoes
Write-Output "[setup-env] Node:" -NoNewline
node --version 2>$null
Write-Output "[setup-env] neu CLI:" -NoNewline
$neuVer = (Get-Command neu -ErrorAction SilentlyContinue)
if ($neuVer) { neu --version } else { Write-Output " nao instalado (npm i -g @neutralinojs/neu)" }
Write-Output "[setup-env] NSIS:" -NoNewline
$makensis = Get-Command makensis -ErrorAction SilentlyContinue
if ($makensis) { & makensis /VERSION 2>$null | Select-Object -First 1 } else { Write-Output " nao encontrado" }
