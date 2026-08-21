Add-Type -AssemblyName System.Windows.Forms,System.Drawing
Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices; public class W { [DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h, out RECT r); [StructLayout(LayoutKind.Sequential)]public struct RECT { public int L,T,R,B; } }
'@
$h = [W]::GetForegroundWindow()
$r = New-Object 'W+RECT'
$ok = [W]::GetWindowRect($h, [ref]$r)
if (-not $ok) { Write-Output 'no rect'; exit }
$w = $r.R - $r.L
$hh = $r.B - $r.T
Write-Output "window: $($r.L),$($r.T) - $($r.R),$($r.B) = ${w}x${hh}"
$bmp = New-Object System.Drawing.Bitmap $w, $hh
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.L, $r.T, 0, 0, (New-Object System.Drawing.Size $w, $hh))
$bmp.Save('E:\Projetos\LOPES FOCUS\tools\app-debug.png')
Write-Output 'Print salvo'
