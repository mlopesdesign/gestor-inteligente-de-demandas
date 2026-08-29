# Seta JAVA_HOME e GRADLE_JAVA_HOME no escopo Machine (sistema)
# Requer execucao como Administrador
$ErrorActionPreference = 'Stop'
$jdkPath = 'A:\AI\sdk\jdk-17\jdk-17.0.20.1+1'
try {
    [Environment]::SetEnvironmentVariable('JAVA_HOME', $jdkPath, 'Machine')
    [Environment]::SetEnvironmentVariable('GRADLE_JAVA_HOME', $jdkPath, 'Machine')
    Write-Host ("JAVA_HOME = " + [Environment]::GetEnvironmentVariable('JAVA_HOME', 'Machine')) -ForegroundColor Green
    Write-Host ("GRADLE_JAVA_HOME = " + [Environment]::GetEnvironmentVariable('GRADLE_JAVA_HOME', 'Machine')) -ForegroundColor Green
} catch {
    Write-Host ("ERRO: " + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
Read-Host "Pressione Enter para fechar"
