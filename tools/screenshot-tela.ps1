# tools/screenshot-tela.ps1 - tira print da tela inteira
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$w = $screen.Width
$h = $screen.Height
Write-Host "Resolucao: ${w}x${h}"

$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$out = "E:\Projetos\LOPES FOCUS\docs\screen-tela.png"
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Host "Salvo: $out"

# Crop do taskbar (assumindo taskbar embaixo, ~40px)
$taskbar = New-Object System.Drawing.Bitmap $w, 60
$gg = [System.Drawing.Graphics]::FromImage($taskbar)
$gg.DrawImage($bmp, 0, 0, (New-Object System.Drawing.Rectangle 0, ($h - 60), $w, 60), [System.Drawing.GraphicsUnit]::Pixel)
$outTask = "E:\Projetos\LOPES FOCUS\docs\screen-taskbar.png"
$taskbar.Save($outTask, [System.Drawing.Imaging.ImageFormat]::Png)
$gg.Dispose(); $taskbar.Dispose()
Write-Host "Salvo: $outTask"
