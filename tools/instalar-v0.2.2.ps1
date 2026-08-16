# tools/instalar-v0.2.2.ps1
# Auto-elevacao e instalacao da v0.2.2 do Gestor Inteligente de Demandas.
# Substitui o .exe, o resources.neu e o icon.ico no Program Files.
# Recria o atalho com icone. Abre o app.
# Uso: powershell -File tools\instalar-v0.2.2.ps1

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$src = Join-Path $root 'dist\GestorInteligenteDeDemandas'
$dst = 'C:\Program Files\Gestor Inteligente de Demandas'
$icon = Join-Path $root 'installer\resources\icon.ico'

# Auto-elevacao: se nao tiver admin, relanca elevado
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  $script = $MyInvocation.MyCommand.Path
  Start-Process powershell -ArgumentList "-NoProfile","-File","`"$script`"" -Verb RunAs
  exit
}

# Mata qualquer instancia do app e do setup
Get-Process -Name "GestorInteligenteDeDemandas","GestorInteligenteDeDemandas-Setup*" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 800

# Garante pasta
New-Item -ItemType Directory -Force -Path $dst | Out-Null

# Copia binarios
Write-Output "[instalar] copiando GestorInteligenteDeDemandas.exe..."
Copy-Item -LiteralPath (Join-Path $src 'GestorInteligenteDeDemandas.exe') -Destination (Join-Path $dst 'GestorInteligenteDeDemandas.exe') -Force
Write-Output "[instalar] copiando resources.neu..."
Copy-Item -LiteralPath (Join-Path $src 'resources.neu') -Destination (Join-Path $dst 'resources.neu') -Force
Write-Output "[instalar] copiando icon.ico..."
Copy-Item -LiteralPath $icon -Destination (Join-Path $dst 'icon.ico') -Force

# Recria atalhos com icone
$shell = New-Object -ComObject WScript.Shell
$startMenu = [Environment]::GetFolderPath('Programs')
$lnk1 = Join-Path $startMenu "Gestor Inteligente de Demandas\Gestor Inteligente de Demandas.lnk"
New-Item -ItemType Directory -Force -Path (Split-Path $lnk1) | Out-Null
$sc = $shell.CreateShortcut($lnk1)
$sc.TargetPath = (Join-Path $dst 'GestorInteligenteDeDemandas.exe')
$sc.IconLocation = (Join-Path $dst 'icon.ico')
$sc.WorkingDirectory = $dst
$sc.Save()
Write-Output "[instalar] atalho do Menu Iniciar: $lnk1"

# Desktop
$desktop = [Environment]::GetFolderPath('Desktop')
$lnk2 = Join-Path $desktop "Gestor Inteligente de Demandas.lnk"
$sc2 = $shell.CreateShortcut($lnk2)
$sc2.TargetPath = (Join-Path $dst 'GestorInteligenteDeDemandas.exe')
$sc2.IconLocation = (Join-Path $dst 'icon.ico')
$sc2.WorkingDirectory = $dst
$sc2.Save()
Write-Output "[instalar] atalho do Desktop: $lnk2"

# Garante pasta de dados
$dataDir = Join-Path $env:APPDATA 'GestorInteligenteDeDemandas\dados'
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $dataDir 'backups') | Out-Null
Write-Output "[instalar] pasta de dados OK: $dataDir"

# Dropa o banco se existir (pra evitar conflito com schema antigo)
$banco = Join-Path $dataDir 'gestor.db'
if (Test-Path $banco) {
  Write-Output "[instalar] dropando banco antigo pra recriar com schema novo: $banco"
  Remove-Item -LiteralPath $banco -Force
}
foreach ($ext in @('-shm','-wal')) {
  $f = "$banco$ext"
  if (Test-Path $f) { Remove-Item -LiteralPath $f -Force }
}

Write-Output "[instalar] abrindo o app..."
Start-Process -FilePath (Join-Path $dst 'GestorInteligenteDeDemandas.exe')

Write-Output "[instalar] OK - v0.2.2 instalada e rodando"
