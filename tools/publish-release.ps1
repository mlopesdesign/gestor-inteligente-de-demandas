# tools/publish-release.ps1
# Empacota a release e publica no GitHub Releases.
#
# Pre-requisitos:
#   - . .\tools\setup-env.ps1
#   - node tools/build.mjs (gera dist/GestorInteligenteDeDemandas)
#   - gh CLI autenticado (gh auth status)
#
# Uso:  powershell -File tools\publish-release.ps1 0.1.0 "Titulo" "Notas markdown"

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$versao = $args[0]
if (-not $versao) { throw "Uso: publish-release.ps1 X.Y.Z 'Titulo' 'Notas'" }
$titulo = if ($args.Length -ge 2) { $args[1] } else { "Gestor v$versao" }
$notas  = if ($args.Length -ge 3) { $args[2] } else { "Release $versao" }

$dist = Join-Path $root 'dist'
$installer = Join-Path $root 'installer'

# 1. Limpa build anterior
if (Test-Path $dist) { Get-ChildItem $dist -Recurse -Force -ErrorAction SilentlyContinue | Where-Object { -not $_.PSIsContainer } | ForEach-Object { Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue } }

# 2. Build
Write-Output "[publish] 1/3 build.mjs" -ForegroundColor Cyan
& node tools/build.mjs 2>&1 | Select-Object -Last 5 | ForEach-Object { Write-Output ("  " + $_) }
if ($LASTEXITCODE -ne 0) { throw "build falhou" }

# 3. NSIS Setup.exe
$nsisScript = Join-Path $installer 'gestor.nsi'
if (Test-Path $nsisScript) {
    Write-Output "[publish] 2/3 makensis.exe" -ForegroundColor Cyan
    Push-Location $installer
    & makensis /V2 gestor.nsi 2>&1 | Select-Object -Last 5 | ForEach-Object { Write-Output ("  " + $_) }
    Pop-Location
    if ($LASTEXITCODE -ne 0) { throw "makensis falhou" }
} else {
    Write-Output "[publish] 2/3 NSIS skip (gestor.nsi nao existe)" -ForegroundColor Yellow
}

# 4. gh release create
Write-Output "[publish] 3/3 gh release" -ForegroundColor Cyan
$assets = @()
if (Test-Path (Join-Path $dist 'GestorInteligenteDeDemandas' 'GestorInteligenteDeDemandas.exe')) {
    $assets += Join-Path $dist 'GestorInteligenteDeDemandas' 'GestorInteligenteDeDemandas.exe'
}
$setupExe = Get-ChildItem $installer -Filter 'GestorInteligenteDeDemandas-Setup-*.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($setupExe) { $assets += $setupExe.FullName }
$neu = Join-Path $dist 'GestorInteligenteDeDemandas' 'resources.neu'
if (Test-Path $neu) { $assets += $neu }

& gh release create "v$versao" --title "$titulo" --notes "$notas" @assets
if ($LASTEXITCODE -ne 0) { throw "gh release create falhou" }

Write-Output "[publish] OK v$versao publicada" -ForegroundColor Green
