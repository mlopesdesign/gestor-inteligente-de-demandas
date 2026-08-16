# tools/screenshot.ps1 - tira print da janela do app
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WP {
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
}
"@

$proc = Get-Process -Name "GestorInteligenteDeDemandas" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -First 1
if (-not $proc) { Write-Output "app nao encontrado"; exit 1 }
$h = $proc.MainWindowHandle
[WP]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 500
$r = New-Object WP+RECT
[WP]::GetWindowRect($h, [ref]$r) | Out-Null
$w = $r.R - $r.L
$hi = $r.B - $r.T
$bmp = New-Object System.Drawing.Bitmap $w, $hi
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
[WP]::PrintWindow($h, $hdc, 2) | Out-Null
$g.ReleaseHdc($hdc)
$out = "E:\Projetos\LOPES FOCUS\docs\app-print-v0.2.5-30s.png"
$bmp.Save($out)
$g.Dispose(); $bmp.Dispose()
Write-Output "screenshot salvo: $out (${w}x${hi})"
