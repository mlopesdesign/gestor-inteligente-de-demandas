#Requires -RunAsAdministrator
# tools/instalar-agora.ps1 — instala o app localmente (auto-elev)
param([string]$Version = "0.2.7")

$ErrorActionPreference = 'Stop'
$root = "E:\Projetos\LOPES FOCUS"
$src = Join-Path $root "dist\GestorInteligenteDeDemandas"
$dst = "C:\Program Files\Gestor Inteligente de Demandas"

# Auto-elevar se necessário
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "[instalar] Sem admin, relancando com elevacao..." -ForegroundColor Yellow
    $arg = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    Start-Process powershell -ArgumentList $arg -Verb RunAs
    exit
}

Write-Host "[instalar] ADMIN OK, instalando v$Version..." -ForegroundColor Green

# Para o app se estiver rodando
Get-Process -Name GestorInteligenteDeDemandas -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Cria pasta se nao existir
if (-not (Test-Path $dst)) {
    New-Item -Path $dst -ItemType Directory -Force | Out-Null
}

# Copia o .exe
Write-Host "[instalar] Copiando GestorInteligenteDeDemandas.exe..." -ForegroundColor Cyan
Copy-Item -Path (Join-Path $src "GestorInteligenteDeDemandas.exe") -Destination (Join-Path $dst "GestorInteligenteDeDemandas.exe") -Force

# Copia o icon
$iconSrc = Join-Path $root "installer\resources\icon.ico"
if (Test-Path $iconSrc) {
    Remove-Item (Join-Path $dst "icon.ico") -ErrorAction SilentlyContinue
    Copy-Item -Path $iconSrc -Destination (Join-Path $dst "icon.ico") -Force
    Write-Host "[instalar] icon.ico OK ($( (Get-Item $iconSrc).Length ) bytes)" -ForegroundColor Green
}

# Copia o resources.neu
Write-Host "[instalar] Copiando resources.neu..." -ForegroundColor Cyan
Copy-Item -Path (Join-Path $src "resources.neu") -Destination (Join-Path $dst "resources.neu") -Force
Write-Host "[instalar] resources.neu OK ($( (Get-Item (Join-Path $src 'resources.neu')).Length ) bytes)" -ForegroundColor Green

# Recria atalhos
Write-Host "[instalar] Recriando atalhos..." -ForegroundColor Cyan
$shell = New-Object -ComObject WScript.Shell

# Atalho no Menu Iniciar
$startMenu = [Environment]::GetFolderPath("Programs")
$appShortcut = Join-Path $startMenu "Gestor Inteligente de Demandas\Gestor Inteligente de Demandas.lnk"
$appDir = New-Item -Path (Join-Path $startMenu "Gestor Inteligente de Demandas") -ItemType Directory -Force
$sc = $shell.CreateShortcut($appShortcut)
$sc.TargetPath = Join-Path $dst "GestorInteligenteDeDemandas.exe"
$sc.WorkingDirectory = $dst
$sc.IconLocation = Join-Path $dst "icon.ico"
$sc.Description = "Gestor Inteligente de Demandas v$Version"
$sc.WindowStyle = 1
$sc.Save()

# Atalho na area de trabalho
$desktop = [Environment]::GetFolderPath("Desktop")
$deskShortcut = Join-Path $desktop "Gestor Inteligente de Demandas.lnk"
$sc2 = $shell.CreateShortcut($deskShortcut)
$sc2.TargetPath = Join-Path $dst "GestorInteligenteDeDemandas.exe"
$sc2.WorkingDirectory = $dst
$sc2.IconLocation = Join-Path $dst "icon.ico"
$sc2.Description = "Gestor Inteligente de Demandas v$Version"
$sc2.WindowStyle = 1
$sc2.Save()

Write-Host "[instalar] Instalado em $dst" -ForegroundColor Green
Write-Host "[instalar] v$Version - pronto pra usar" -ForegroundColor Green
