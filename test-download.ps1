$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$tmp = 'E:\Projetos\LOPES FOCUS\test-download.neu'
$url = 'https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases/download/v0.2.17/resources.neu'
try {
  Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
  $sz = (Get-Item $tmp).Length
  Write-Output ("OK size=" + $sz)
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
