# Limpa JAVA_HOME do escopo User pra cair no Machine
$ErrorActionPreference = 'Stop'
[Environment]::SetEnvironmentVariable('JAVA_HOME', $null, 'User')
[Environment]::SetEnvironmentVariable('GRADLE_JAVA_HOME', $null, 'User')
Write-Host ("JAVA_HOME User apos clear: " + [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User')) -ForegroundColor Green
Write-Host ("JAVA_HOME effective: " + [Environment]::GetEnvironmentVariable('JAVA_HOME')) -ForegroundColor Green
Read-Host "Pressione Enter"
