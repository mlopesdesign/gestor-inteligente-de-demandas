# tools/build-installer.ps1 — empacota o desktop em .exe via jpackage
#
# Uso:  powershell -File tools\build-installer.ps1
# Requer:  . .\tools\setup-env.ps1
# Saída:  release\GestorInteligenteDeDemandas\GestorInteligenteDeDemandas.exe
#         (jpackage --type app-image — instalador .exe único via msi também possível)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$jdkHome = $env:JAVA_HOME
if (-not $jdkHome) { throw "JAVA_HOME nao configurado. Rode: . .\tools\setup-env.ps1" }

$desktopDir = Join-Path $root 'desktop'
$target = Join-Path $desktopDir 'target'
$release = Join-Path $root 'release'
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$destTmp = Join-Path $release "build-$stamp"
$appImage = Join-Path $destTmp 'GestorInteligenteDeDemandas'

# 1. Build desktop
$env:Path = "$jdkHome\bin;$env:Path"
Write-Output "[build-installer] mvn -pl desktop -am package" -ForegroundColor Cyan
& mvn -B -ntp -pl desktop -am package -DskipTests 2>&1 | Select-Object -Last 8 | ForEach-Object { Write-Output ("  " + $_) }

# 2. Localiza JavaFX SDK (jpackage precisa de --module-path com javafx)
$javafxLibs = @()
$m2 = Join-Path $env:USERPROFILE '.m2\repository\org\openjfx'
if (Test-Path $m2) {
    Get-ChildItem -Path $m2 -Recurse -Filter '*.jar' -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^(javafx-base|javafx-controls|javafx-fxml|javafx-graphics|javafx-media|javafx-web)-21' } |
        ForEach-Object { $javafxLibs += $_.FullName }
}
if ($javafxLibs.Count -eq 0) {
    throw "JavaFX 21 jars nao encontrados em $m2. Rode mvn -pl desktop -am package antes."
}
$modulePath = ($javafxLibs -join ';')

# 3. (Pasta de destino nova por timestamp; sem limpeza)

# 4. jpackage --type app-image
$jar = Join-Path $target 'desktop-0.1.0.jar'
if (-not (Test-Path $jar)) { throw "JAR nao encontrado: $jar" }

$icon = $null
$iconPath = Join-Path $root 'installer\resources\icon.ico'
if (Test-Path $iconPath) { $icon = $iconPath }

$jpkgArgs = @(
    '--type', 'app-image',
    '--name', 'GestorInteligenteDeDemandas',
    '--app-version', '0.1.0',
    '--vendor', 'ML Lopes Design',
    '--description', 'Gestor Inteligente de Demandas - ML Lopes Design',
    '--input', $target,
    '--main-jar', 'desktop-0.1.0.jar',
    '--main-class', 'app.mllopes.gestor.App',
    '--module-path', $modulePath,
    '--add-modules', 'javafx.controls,javafx.fxml,javafx.graphics,javafx.web,javafx.media',
    '--dest', $release,
    '--java-options', '-Xms32m -Xmx512m',
    '--dest', $destTmp
)
if ($icon) { $jpkgArgs += @('--icon', $icon) }

Write-Output "[build-installer] jpackage ..." -ForegroundColor Cyan
& "$jdkHome\bin\jpackage.exe" @jpkgArgs 2>&1 | ForEach-Object { Write-Output ("  " + $_) }

if (Test-Path (Join-Path $appImage 'GestorInteligenteDeDemandas.exe')) {
    $exe = Get-Item (Join-Path $appImage 'GestorInteligenteDeDemandas.exe')
    Write-Output ""
    Write-Output "[build-installer] OK: $($exe.FullName) ($([math]::Round($exe.Length/1MB,1)) MB)" -ForegroundColor Green
} else {
    throw "jpackage nao gerou o executavel esperado em $appImage"
}
