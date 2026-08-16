# tools/screenshot-devtools.ps1 - print da janela DevTools
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WD {
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
}
"@

$proc = Get-Process -Name "msedgewebview2" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*DevTools*" } | Select-Object -First 1
if (-not $proc) { Write-Output "DevTools nao encontrado"; exit 1 }
$h = $proc.MainWindowHandle
[WD]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 800
$r = New-Object WD+RECT
[WD]::GetWindowRect($h, [ref]$r) | Out-Null
$w = $r.R - $r.L; $hi = $r.B - $r.T
$bmp = New-Object System.Drawing.Bitmap $w, $hi
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
[WD]::PrintWindow($h, $hdc, 2) | Out-Null
$g.ReleaseHdc($hdc)
$bmp.Save("E:\Projetos\LOPES FOCUS\docs\devtools-v0.2.5.png")
$g.Dispose(); $bmp.Dispose()
Write-Output "screenshot DevTools salvo (${w}x${hi})"
