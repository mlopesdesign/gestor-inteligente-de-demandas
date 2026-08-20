# tools/fix-chrome-profiles.ps1
# Recupera perfis do Chrome que ficaram orfaos (so Default no Local State).
#
# CAUSA: o info_cache do Local State foi sobrescrito/reiniciado mas as pastas
#        Profile N continuam no disco com Bookmarks/History/Login Data intactos.
# FIX:   le o nome de cada Profile N do proprio arquivo Preferences e re-injeta
#        no info_cache do Local State.
#
# Uso: powershell -File tools\fix-chrome-profiles.ps1
# Pre-requisito: Chrome FECHADO (senao o Local State vai ser reescrito ao fechar).

$ErrorActionPreference = 'Stop'

$ud = Join-Path $env:LOCALAPPDATA 'Google\Chrome\User Data'
$localState = Join-Path $ud 'Local State'
$backup = Join-Path $ud ('Local State.backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))

if (-not (Test-Path $localState)) { throw "Local State nao existe em $localState" }

# 1. Backup
Copy-Item $localState $backup -Force
Write-Host "[backup] $backup" -ForegroundColor Yellow

# 2. Carrega Local State
$json = Get-Content $localState -Raw
$obj = $json | ConvertFrom-Json

# 3. Varre Profile N existentes no disco
$profiles = Get-ChildItem $ud -Directory -Filter 'Profile *' | Sort-Object { [int]($_.Name -replace 'Profile ','') }
Write-Host "[scan] $($profiles.Count) Profile N no disco" -ForegroundColor Cyan

# 4. Le nome de cada um do Preferences
$info = $obj.profile.info_cache
foreach ($p in $profiles) {
    $name = $p.Name
    $displayName = $p.Name
    $prefPath = Join-Path $p.FullName 'Preferences'
    if (Test-Path $prefPath) {
        try {
            $pref = Get-Content $prefPath -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($pref.profile.name) { $displayName = $pref.profile.name }
            if ($pref.profile.user_name) { $gaia = $pref.profile.user_name }
        } catch {}
    }
    # Cria ou atualiza entrada no info_cache
    if (-not $info.$name) {
        $info | Add-Member -NotePropertyName $name -NotePropertyValue ([PSCustomObject]@{
            name = $displayName
            user_name = $gaia
            is_using_default_name = $false
            is_using_default_avatar = $true
        }) -Force
        Write-Host "  + $name  $displayName" -ForegroundColor Green
    } else {
        Write-Host "  = $name  $($info.$name.name)" -ForegroundColor DarkGray
    }
}

# 5. Salva (UTF-8 sem BOM, o Chrome exige isso)
$newJson = $obj | ConvertTo-Json -Depth 20
$utf8NoBom = New-Object System.Text.UTF8Encoding $False
[System.IO.File]::WriteAllText($localState, $newJson, $utf8NoBom)
Write-Host ""
Write-Host "[ok] Local State atualizado com $($profiles.Count) perfis" -ForegroundColor Green
Write-Host "[ok] Pode abrir o Chrome agora. Todos os perfis devem aparecer." -ForegroundColor Green
Write-Host "[ok] Se algo der errado, backup em: $backup" -ForegroundColor Yellow
