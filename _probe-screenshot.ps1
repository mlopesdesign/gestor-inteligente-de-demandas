Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$proc = Get-Process | Where-Object {$_.Name -like 'Gestor*'} | Select-Object -First 1
$wshell = New-Object -ComObject wscript.shell
$wshell.AppActivate($proc.Id) | Out-Null
Start-Sleep -Milliseconds 800
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bmp.Save('E:\Projetos\LOPES FOCUS\_probe-desktop.png')
$g.Dispose(); $bmp.Dispose()
Write-Output "screenshot salvo"
