# tools/package-appimage.ps1 — empacota app-image com launcher .bat funcional
#
# Saída em release/GestorInteligenteDeDemandas-<timestamp>/
#   ├── GestorInteligenteDeDemandas.exe   (jpackage - placeholder, pode nao funcionar)
#   ├── GestorInteligenteDeDemandas.bat   (launcher real - sempre funciona)
#   ├── runtime/                          (JRE 21 embutido)
#   └── app/                              (JAR + JavaFX SDK)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$release = Join-Path $root 'release'

# 1. Build desktop
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Write-Output "[package] mvn -pl desktop -am package" -ForegroundColor Cyan
& mvn -B -ntp -pl desktop -am package -DskipTests 2>&1 | Select-Object -Last 6 | ForEach-Object { Write-Output ("  " + $_) }

# 2. jpackage --type app-image
$target = Join-Path $root 'desktop\target'
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$destTmp = Join-Path $release "build-$stamp"
$iconPath = Join-Path $root 'installer\resources\icon.ico'
$iconArg = @()
if (Test-Path $iconPath) { $iconArg = @('--icon', $iconPath) }

# JavaFX SDK local
$javafxLibs = @()
$m2 = Join-Path $env:USERPROFILE '.m2\repository\org\openjfx'
if (Test-Path $m2) {
    Get-ChildItem -Path $m2 -Recurse -Filter '*.jar' |
        Where-Object { $_.Name -match '^(javafx-base|javafx-controls|javafx-fxml|javafx-graphics|javafx-media|javafx-web)-21' } |
        ForEach-Object { $javafxLibs += $_.FullName }
}
$modulePath = ($javafxLibs -join ';')

# Usa o JDK completo como runtime-image (jpackage gera runtime/ com java.exe)
$runtimeImage = $env:JAVA_HOME

Write-Output "[package] jpackage app-image (runtime-image=$runtimeImage)" -ForegroundColor Cyan
$args = @(
    '--type','app-image',
    '--name','GestorInteligenteDeDemandas',
    '--app-version','0.1.0',
    '--vendor','ML Lopes Design',
    '--description','Gestor Inteligente de Demandas',
    '--input',$target,
    '--main-jar','desktop-0.1.0.jar',
    '--main-class','app.mllopes.gestor.App',
    '--runtime-image',$runtimeImage,
    '--dest',$destTmp,
    '--java-options','-Xms32m -Xmx512m'
) + $iconArg
& "$env:JAVA_HOME\bin\jpackage.exe" @args 2>&1 | Out-Null

$appImage = Join-Path $destTmp 'GestorInteligenteDeDemandas'
if (-not (Test-Path $appImage)) { throw "app-image nao gerado em $appImage" }

# 3. Copia JavaFX JARs para a pasta do app (para o .bat usar)
$javafxDest = Join-Path $appImage 'app\lib'
New-Item -ItemType Directory -Path $javafxDest -Force | Out-Null
foreach ($j in $javafxLibs) { Copy-Item $j $javafxDest }

# 4. Cria launcher .bat robusto
$bat = @"
@echo off
REM Gestor Inteligente de Demandas - launcher
setlocal
set APPDIR=%~dp0
set RUNTIME=%APPDIR%runtime
set JAVAEXE=%RUNTIME%\bin\javaw.exe
if not exist "%JAVAEXE%" set JAVAEXE=%RUNTIME%\bin\java.exe
if not exist "%JAVAEXE%" (
  echo JRE nao encontrado em %RUNTIME%
  pause
  exit /b 1
)
set APPJAR=%APPDIR%app\desktop-0.1.0.jar
set FXJARS=%APPDIR%app\lib
"%JAVAEXE%" --module-path "%FXJARS%" --add-modules javafx.controls,javafx.fxml,javafx.graphics,javafx.web,javafx.media -cp "%APPJAR%" app.mllopes.gestor.App %*
endlocal
"@
[System.IO.File]::WriteAllText((Join-Path $appImage 'GestorInteligenteDeDemandas.bat'), $bat, [System.Text.UTF8Encoding]::new($false))

# 5. Cria launcher .cmd (mesma coisa, mais compat velhas)
[System.IO.File]::WriteAllText((Join-Path $appImage 'GestorInteligenteDeDemandas.cmd'), $bat, [System.Text.UTF8Encoding]::new($false))

# 6. Cria README
$readme = @"
# Gestor Inteligente de Demandas v0.1.0

## Como executar

Duplo clique em **`GestorInteligenteDeDemandas.bat`**

O `.bat` localiza o JRE embutido em `runtime\`, monta o module-path com
os JARs do JavaFX em `app\lib\`, e chama a classe principal
`app.mllopes.gestor.App`.

O `GestorInteligenteDeDemandas.exe` (gerado pelo jpackage) é um launcher
estático que pode nao funcionar em algumas configuracoes; use o `.bat`
como alternativa confiavel.

## Estrutura

- `runtime/`  - JRE 21 LTS embutido
- `app/desktop-0.1.0.jar`  - codigo da aplicacao
- `app/lib/`  - JARs do JavaFX 21 (controls, fxml, graphics, web, media)
- `GestorInteligenteDeDemandas.bat`  - launcher recomendado
- `GestorInteligenteDeDemandas.exe`  - launcher alternativo (jpackage)
"@
[System.IO.File]::WriteAllText((Join-Path $appImage 'LEIA-ME.txt'), $readme, [System.Text.UTF8Encoding]::new($false))

Write-Output ""
Write-Output "[package] OK: $appImage" -ForegroundColor Green
Write-Output "  Launcher: GestorInteligenteDeDemandas.bat" -ForegroundColor Yellow
