# tools/screenshot-v2.ps1 - tira print da janela do app por PID
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WP {
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, System.Text.StringBuilder lpClassName, int nMaxCount);
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
}
"@

$pid_target = (Get-Process -Name "GestorInteligenteDeDemandas" -ErrorAction SilentlyContinue).Id | Select-Object -First 1
if (-not $pid_target) { Write-Output "app nao encontrado"; exit 1 }
Write-Host "PID alvo: $pid_target"

# Enumera janelas do PID
$hwnd_found = [IntPtr]::Zero
$callback = {
  param($h, $l)
  $p = 0
  [void][WP]::GetWindowThreadProcessId($h, [ref]$p)
  if ($p -eq $pid_target) {
    $sb = New-Object System.Text.StringBuilder(256)
    [void][WP]::GetWindowText($h, $sb, 256)
    $title = $sb.ToString()
    $visible = [WP]::IsWindowVisible($h)
    $r2 = New-Object WP+RECT
    [void][WP]::GetWindowRect($h, [ref]$r2)
    $w2 = $r2.R - $r2.L
    $hi2 = $r2.B - $r2.T
    if ($visible -and $w2 -gt 200 -and $hi2 -gt 200) {
      Write-Host "ENCONTREI hwnd=$h title='$title' size=${w2}x${hi2}"
      $script:hwnd_found = $h
    }
  }
  return $true
}
[void][WP]::EnumWindows($callback, [IntPtr]::Zero)

if ($script:hwnd_found -eq [IntPtr]::Zero) {
  Write-Output "nenhuma janela visivel > 200x200 do PID $pid_target"
  exit 1
}

$h = $script:hwnd_found
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
$out = "E:\Projetos\LOPES FOCUS\docs\app-print-v0.2.7.png"
$bmp.Save($out)
$g.Dispose(); $bmp.Dispose()
Write-Output "screenshot salvo: $out (${w}x${hi})"
