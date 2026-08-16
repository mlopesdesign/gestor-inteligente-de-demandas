# tools/instalar-v0.2.4.ps1
# Auto-elevacao + copia binarios + recria atalhos com icone + abre o app
# Uso: powershell -File tools\instalar-v0.2.4.ps1

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$src = Join-Path $root 'dist\GestorInteligenteDeDemandas'
$dst = 'C:\Program Files\Gestor Inteligente de Demandas'
$icon = Join-Path $root 'installer\resources\icon.ico'

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  $script = $MyInvocation.MyCommand.Path
  Start-Process powershell -ArgumentList "-NoProfile","-File","`"$script`"" -Verb RunAs
  exit
}

Get-Process -Name "GestorInteligenteDeDemandas","GestorInteligenteDeDemandas-Setup*" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 800

New-Item -ItemType Directory -Force -Path $dst | Out-Null

# Apaga o icon.ico existente (0 bytes) pra evitar cache de instalacao
$dstIcon = Join-Path $dst 'icon.ico'
if (Test-Path $dstIcon) { Remove-Item -LiteralPath $dstIcon -Force -ErrorAction SilentlyContinue }

Write-Output "[instalar] copiando GestorInteligenteDeDemandas.exe..."
Copy-Item -LiteralPath (Join-Path $src 'GestorInteligenteDeDemandas.exe') -Destination (Join-Path $dst 'GestorInteligenteDeDemandas.exe') -Force
Write-Output "[instalar] copiando resources.neu..."
Copy-Item -LiteralPath (Join-Path $src 'resources.neu') -Destination (Join-Path $dst 'resources.neu') -Force
Write-Output "[instalar] copiando icon.ico..."
Copy-Item -LiteralPath $icon -Destination $dstIcon -Force

# Valida que nao ficou 0 bytes
$len = (Get-Item $dstIcon -ErrorAction SilentlyContinue).Length
if ($len -lt 1000) {
  throw "icon.ico nao foi copiado direito (tamanho: $len bytes)"
}
Write-Output "[instalar] icon.ico OK ($len bytes)"

# Recria atalhos com icone
$shell = New-Object -ComObject WScript.Shell
$startMenu = [Environment]::GetFolderPath('Programs')
$lnk1 = Join-Path $startMenu "Gestor Inteligente de Demandas\Gestor Inteligente de Demandas.lnk"
New-Item -ItemType Directory -Force -Path (Split-Path $lnk1) | Out-Null
$sc = $shell.CreateShortcut($lnk1)
$sc.TargetPath = (Join-Path $dst 'GestorInteligenteDeDemandas.exe')
$sc.IconLocation = $dstIcon
$sc.WorkingDirectory = $dst
$sc.Save()
Write-Output "[instalar] atalho do Menu Iniciar: $lnk1"

$desktop = [Environment]::GetFolderPath('Desktop')
$lnk2 = Join-Path $desktop "Gestor Inteligente de Demandas.lnk"
$sc2 = $shell.CreateShortcut($lnk2)
$sc2.TargetPath = (Join-Path $dst 'GestorInteligenteDeDemandas.exe')
$sc2.IconLocation = $dstIcon
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
  Write-Output "[instalar] dropando banco antigo: $banco"
  Remove-Item -LiteralPath $banco -Force
}
foreach ($ext in @('-shm','-wal')) {
  $f = "$banco$ext"
  if (Test-Path $f) { Remove-Item -LiteralPath $f -Force }
}

Write-Output "[instalar] abrindo o app..."
Start-Process -FilePath (Join-Path $dst 'GestorInteligenteDeDemandas.exe')

Write-Output "[instalar] OK - v0.2.4 instalada e rodando"
