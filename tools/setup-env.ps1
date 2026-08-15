# tools/setup-env.ps1
# Configura o ambiente de build do Gestor Inteligente de Demandas.
# Source:  . .\tools\setup-env.ps1
#
# Define:
#   JAVA_HOME -> tools\jdk\jdk-21.0.5+11
#   MAVEN_HOME -> tools\maven\apache-maven-3.9.9
#   WIX_HOME (opcional) -> ... se instalado
#   PATH inclui os binários acima
#
# Não instala nada no sistema. Tudo portátil em tools\.

$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$jdkHome = Join-Path $root 'tools\jdk\jdk-21.0.5+11'
$mavenHome = Join-Path $root 'tools\maven\apache-maven-3.9.9'
$wixHome = Join-Path $root 'tools\wix\wix311'

if (-not (Test-Path (Join-Path $jdkHome 'bin\java.exe'))) {
    throw "JDK nao encontrado em $jdkHome. Baixe e extraia o Temurin 21 LTS x64 em tools\jdk\."
}
if (-not (Test-Path (Join-Path $mavenHome 'bin\mvn.cmd'))) {
    throw "Maven nao encontrado em $mavenHome. Baixe e extraia o Apache Maven 3.9+ em tools\maven\."
}

$env:JAVA_HOME = $jdkHome
$env:MAVEN_HOME = $mavenHome
$env:Path = "$jdkHome\bin;$mavenHome\bin;$env:Path"

if (Test-Path (Join-Path $wixHome 'bin\candle.exe')) {
    $env:WIX_HOME = $wixHome
    $env:Path = "$wixHome\bin;$env:Path"
    Write-Output "WIX_HOME configurado: $wixHome" -ForegroundColor DarkGray
}

Write-Output "JAVA_HOME  = $env:JAVA_HOME" -ForegroundColor Green
Write-Output "MAVEN_HOME = $env:MAVEN_HOME" -ForegroundColor Green
& cmd /c "$env:JAVA_HOME\bin\java.exe -version" 2>&1 | ForEach-Object { Write-Output ("  " + $_) }
& cmd /c "$env:MAVEN_HOME\bin\mvn.cmd -version" 2>&1 | Select-Object -First 4 | ForEach-Object { Write-Output ("  " + $_) }
