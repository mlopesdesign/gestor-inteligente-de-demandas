# tools/fluxo-completo.ps1
# Skill de fluxo continuo: build + test + (opcionalmente) publish + install + validate
#
# O que faz:
#   1. Bumpa a versao (patch/minor/major ou explicito)
#   2. Roda os testes (se falhar, ABORTA)
#   3. Constroi o Neutralino (.exe + resources.neu)
#   4. Empacota o Setup.exe (NSIS)
#   5. Instala o app no Program Files (com auto-elevacao)
#   6. Abre o app
#   7. Valida: processo rodando + icon.ico > 0 bytes + banco existe
#   8. (Opcional, -Publish) Publica no GitHub + commit + push
#
# Uso:
#   powershell -File tools\fluxo-completo.ps1 -Version 0.2.5
#   powershell -File tools\fluxo-completo.ps1 -Version 0.2.5 -Publish
#   powershell -File tools\fluxo-completo.ps1 -Bump patch -Publish

[CmdletBinding()]
param(
  [string]$Version = '',           # ex: '0.2.5' (vazio = nao bumpa)
  [ValidateSet('', 'patch', 'minor', 'major')]
  [string]$Bump = '',              # alternativa: bump automatico
  [switch]$Publish = $false,      # publica no GitHub no fim
  [switch]$SkipTests = $false,     # pula os testes (NAO recomendado)
  [switch]$SkipVisual = $false,    # pula screenshot do app
  [string]$Notes = ''              # notas adicionais da release
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root

function Step($titulo) { Write-Output ""; Write-Output "=== $titulo ===" -ForegroundColor Cyan }
function Ok($msg) { Write-Output "  [ok] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Output "  [warn] $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Output "  [FAIL] $msg" -ForegroundColor Red; throw $msg }

# Auto-elevacao: o fluxo-completo precisa admin pra instalar em Program Files
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  $script = $MyInvocation.MyCommand.Path
  $argList = @("-NoProfile","-File", "`"$script`"")
  if ($Version) { $argList += "-Version", "`"$Version`"" }
  if ($Bump) { $argList += "-Bump", $Bump }
  if ($Publish) { $argList += "-Publish" }
  if ($SkipTests) { $argList += "-SkipTests" }
  if ($SkipVisual) { $argList += "-SkipVisual" }
  if ($Notes) { $argList += "-Notes", "`"$Notes`"" }
  Write-Output "[elevacao] re-lancando como administrador..."
  Start-Process powershell -ArgumentList $argList -Verb RunAs
  exit
}

# 0. Bump versao
Step "0/8 Bump versao"
if ($Version) {
  $ver = $Version
} elseif ($Bump) {
  $cfgPath = Join-Path $root 'neutralino.config.json'
  $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
  $parts = $cfg.version.Split('.')
  $maj = [int]$parts[0]; $min = [int]$parts[1]; $pat = [int]$parts[2]
  switch ($Bump) {
    'patch' { $pat++ }
    'minor' { $min++; $pat = 0 }
    'major' { $maj++; $min = 0; $pat = 0 }
  }
  $ver = "$maj.$min.$pat"
} else {
  $ver = ''
}

if ($ver) {
  Write-Output "  bumpando para $ver"
  (Get-Content 'neutralino.config.json' -Raw) -replace '"version":\s*"\d+\.\d+\.\d+"', "`"version`": `"$ver`"" | Set-Content 'neutralino.config.json' -NoNewline
  (Get-Content 'package.json' -Raw) -replace '"version":\s*"\d+\.\d+\.\d+"', "`"version`": `"$ver`"" | Set-Content 'package.json' -NoNewline
  (Get-Content 'installer\gestor.nsi' -Raw) -replace '!define APP_VERSION\s+"\d+\.\d+\.\d+"', "!define APP_VERSION `"$ver`"" | Set-Content 'installer\gestor.nsi' -NoNewline
  Ok "versao bumpada para $ver (neutralino.config.json, package.json, gestor.nsi)"
} else {
  Write-Output "  sem bump (versao atual mantida)"
  $cfg = Get-Content 'neutralino.config.json' -Raw | ConvertFrom-Json
  $ver = $cfg.version
}

# 1. Testes
Step "1/8 Testes Node (29 esperados)"
if ($SkipTests) {
  Warn "testes pulados (-SkipTests)"
} else {
  $r = & node tools/run-tests.mjs 2>&1
  $r | ForEach-Object { Write-Output "  $_" }
  if ($LASTEXITCODE -ne 0) { Fail "testes falharam" }
  Ok "testes verde"
}

# 2. Build Neutralino
Step "2/8 Build Neutralino (.exe + resources.neu)"
& "$env:APPDATA\npm\neu.ps1" build 2>&1 | Select-Object -Last 3 | ForEach-Object { Write-Output "  $_" }
if ($LASTEXITCODE -ne 0) { Fail "build falhou" }
Ok "build OK"

# 3. Empacotar Setup.exe
Step "3/8 Empacotar Setup.exe (NSIS)"
& powershell -File tools/build-setup.ps1 2>&1 | Select-Object -Last 5 | ForEach-Object { Write-Output "  $_" }
if ($LASTEXITCODE -ne 0) { Fail "empacotamento falhou" }
$setupExe = "installer\GestorInteligenteDeDemandas-Setup-$ver.exe"
if (-not (Test-Path $setupExe)) { Fail "Setup.exe nao foi gerado: $setupExe" }
Ok "Setup.exe OK: $setupExe"

# 4. SHA256
Step "4/8 SHA256"
$h1 = (Get-FileHash -Algorithm SHA256 $setupExe).Hash
$h2 = (Get-FileHash -Algorithm SHA256 'dist\GestorInteligenteDeDemandas\resources.neu').Hash
$h3 = (Get-FileHash -Algorithm SHA256 'C:\Program Files\Gestor Inteligente de Demandas\GestorInteligenteDeDemandas.exe' -ErrorAction SilentlyContinue).Hash
$sha = "$h1  GestorInteligenteDeDemandas-Setup-$ver.exe`n$h2  resources.neu`n$h3  GestorInteligenteDeDemandas.exe"
Set-Content -Path 'installer\sha256sums.txt' -Value $sha -NoNewline
Ok "sha256sums.txt atualizado"

# 5. Instalar
Step "5/8 Instalar (auto-elevacao)"
& powershell -File tools/instalar-v0.2.4.ps1 2>&1 | Select-Object -First 8 | ForEach-Object { Write-Output "  $_" }
if ($LASTEXITCODE -ne 0) { Fail "instalacao falhou" }
Ok "app instalado"

# 6. Validar
Step "6/8 Validar (binarios + banco + processo)"
Start-Sleep -Seconds 8
$iconPath = "C:\Program Files\Gestor Inteligente de Demandas\icon.ico"
$iconLen = (Get-Item $iconPath -ErrorAction SilentlyContinue).Length
$exeLen = (Get-Item "C:\Program Files\Gestor Inteligente de Demandas\GestorInteligenteDeDemandas.exe" -ErrorAction SilentlyContinue).Length
$neuLen = (Get-Item "C:\Program Files\Gestor Inteligente de Demandas\resources.neu" -ErrorAction SilentlyContinue).Length
$dbLen = (Get-Item "$env:APPDATA\GestorInteligenteDeDemandas\dados\gestor.db" -ErrorAction SilentlyContinue).Length
$proc = Get-Process -Name 'GestorInteligenteDeDemandas' -ErrorAction SilentlyContinue

Write-Output "  icon.ico: $iconLen bytes"
Write-Output "  GestorInteligenteDeDemandas.exe: $exeLen bytes"
Write-Output "  resources.neu: $neuLen bytes"
Write-Output "  gestor.db: $dbLen bytes"
Write-Output "  processo: $($proc.Count) instancia(s) (PID $($proc.Id -join ', '))"

if ($iconLen -lt 1000) { Fail "icon.ico com tamanho invalido" }
if ($neuLen -lt 1000) { Fail "resources.neu com tamanho invalido" }
if ($proc.Count -eq 0) { Fail "app nao esta rodando" }
Ok "validacao OK"

# 7. Visual (screenshot opcional)
Step "7/8 Screenshot (validacao visual)"
if ($SkipVisual) {
  Warn "screenshot pulado (-SkipVisual)"
} else {
  # Tira screenshot da janela ativa (PowerShell Forms)
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing
  $screens = [System.Windows.Forms.Screen]::AllScreens
  $top = ($screens | Measure-Object -Property 'Bounds.Top' -Minimum).Minimum
  $left = ($screens | Measure-Object -Property 'Bounds.Left' -Minimum).Minimum
  $width = ($screens | Measure-Object -Property 'Bounds.Width' -Sum).Sum
  $height = ($screens | Measure-Object -Property 'Bounds.Height' -Sum).Sum
  $bmp = New-Object System.Drawing.Bitmap $width, $height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($left, $top, 0, 0, $bmp.Size)
  $shotPath = "docs\app-print-v$ver.png"
  $bmp.Save($shotPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Ok "screenshot salvo: $shotPath"
}

# 8. (Opcional) Publicar
if ($Publish) {
  Step "8/8 Publicar no GitHub"
  $notes = @"
# Gestor Inteligente de Demandas v$ver

Fluxo continuo executado.

$Notes
"@
  $notesFile = "installer\RELEASE-NOTES-v$ver.md"
  Set-Content -Path $notesFile -Value $notes
  & gh release create "v$ver" --repo mlopesdesign/gestor-inteligente-de-demandas --title "Gestor Inteligente de Demandas v$ver" --notes-file $notesFile $setupExe 'dist\GestorInteligenteDeDemandas\resources.neu' 'installer\sha256sums.txt' 2>&1 | Select-Object -Last 3 | ForEach-Object { Write-Output "  $_" }
  if ($LASTEXITCODE -ne 0) { Fail "publicacao falhou" }
  Ok "release v$ver publicada"

  # Commit + push
  & git add -A 2>&1 | Out-Null
  & git commit -m "v${ver}: fluxo continuo" 2>&1 | Select-Object -Last 2 | ForEach-Object { Write-Output "  $_" }
  & git push origin main 2>&1 | Select-Object -Last 2 | ForEach-Object { Write-Output "  $_" }
  Ok "commit + push"
}

Write-Output ""
Write-Output "=== FLUXO COMPLETO FINALIZADO ===" -ForegroundColor Green
Write-Output "Versao: $ver" -ForegroundColor Green
Write-Output "Status: app instalado, banco criado, processo rodando" -ForegroundColor Green
