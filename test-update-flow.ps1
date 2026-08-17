param(
  [string]$Url = 'https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/download/v0.2.17/resources.neu',
  [string]$AppPath = 'C:\Program Files\Gestor Inteligente de Demandas',
  [string]$Label = 'test-direct'
)
# Testa o EXATO comando PowerShell que o app vai usar em aplicarAtualizacao()
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$tmp = Join-Path $AppPath ($Label + '-resources.neu.tmp')
$dst = Join-Path $AppPath 'resources.neu'
$old = Join-Path $AppPath 'resources.neu.old'
$bak = Join-Path $AppPath 'resources.neu.test-bak'

# Backup do .neu atual pra nao perder
if (Test-Path $dst) {
  Copy-Item -Force $dst $bak
  Write-Output ("backup: " + $bak)
}

try {
  if (Test-Path $old) { Remove-Item -Force $old }
  Invoke-WebRequest -Uri $Url -OutFile $tmp -UseBasicParsing
  $sz = (Get-Item $tmp).Length
  if ($sz -lt 100000) { throw ('arquivo muito pequeno: ' + $sz + ' bytes') }
  if (Test-Path $dst) { Move-Item -Force $dst $old }
  Move-Item -Force $tmp $dst
  Write-Output ('OK size=' + $sz)
} catch {
  if (Test-Path $tmp) { Remove-Item -Force $tmp -ErrorAction SilentlyContinue }
  Write-Error $_.Exception.Message
  exit 1
}
