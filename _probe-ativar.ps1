$wshell = New-Object -ComObject wscript.shell
$ok = $wshell.AppActivate('Gestor Inteligente')
Write-Output "AppActivate: $ok"
