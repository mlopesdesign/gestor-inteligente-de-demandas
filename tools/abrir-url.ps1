# tools/abrir-url.ps1 - abre URL no Chrome pra teste
param([string]$Url = "http://127.0.0.1:53781/")

Start-Process "chrome.exe" -ArgumentList "--new-window", "--incognito", $Url
Start-Sleep -Seconds 3
Write-Host "Chrome aberto em $Url"
