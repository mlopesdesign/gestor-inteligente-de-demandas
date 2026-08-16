# tools/limpar-banco-lixo.ps1
# Limpa o banco lixo que ficou de uma versao antiga (gestor_local.db com schema simplificado).
# Seguranca: so mexe em %APPDATA%\GestorInteligenteDeDemandas\ e move pra .bak.lixo (nao deleta).
# Uso:  powershell -File tools\limpar-banco-lixo.ps1

$ErrorActionPreference = 'Stop'
$dir = Join-Path $env:APPDATA 'GestorInteligenteDeDemandas'
if (-not (Test-Path $dir)) { Write-Output "[limpar] pasta nao existe: $dir"; exit 0 }

$lixos = @('gestor_local.db', 'gestor_local.db-shm', 'gestor_local.db-wal')
foreach ($f in $lixos) {
  $src = Join-Path $dir $f
  if (Test-Path $src) {
    $dst = "$src.bak.lixo"
    Write-Output "[limpar] movendo $f -> $([System.IO.Path]::GetFileName($dst))"
    Move-Item -LiteralPath $src -Destination $dst -Force
  }
}
Write-Output "[limpar] OK"
