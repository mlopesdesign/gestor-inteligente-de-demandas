# tools/screenshot-v4.ps1 - restaura a janela e tira print
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WP {
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int hi, bool repaint);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern int GetClassName(IntPtr hWnd, System.Text.StringBuilder lpClassName, int nMaxCount);
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
}
"@

$pid_target = (Get-Process -Name "GestorInteligenteDeDemandas" -ErrorAction SilentlyContinue).Id | Select-Object -First 1
if (-not $pid_target) { Write-Output "app nao encontrado"; exit 1 }
Write-Host "PID alvo: $pid_target"

$hwnd_found = [IntPtr]::Zero
$callback = {
  param($h, $l)
  $p = 0
  [void][WP]::GetWindowThreadProcessId($h, [ref]$p)
  if ($p -eq $pid_target) {
    $cn = New-Object System.Text.StringBuilder(256)
    [void][WP]::GetClassName($h, $cn, 256)
    if ($cn.ToString() -eq 'Neutralinojs_webview') {
      $script:hwnd_found = $h
    }
  }
  return $true
}
[void][WP]::EnumWindows($callback, [IntPtr]::Zero)

if ($script:hwnd_found -eq [IntPtr]::Zero) {
  Write-Output "janela Neutralinojs_webview nao encontrada"
  exit 1
}

$h = $script:hwnd_found
Write-Host "hwnd: $h"

# SW_RESTORE = 9 (restaura janela minimizada)
[WP]::ShowWindow($h, 9) | Out-Null
[WP]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Seconds 1

# Move pra posicao visivel
[WP]::MoveWindow($h, 100, 100, 1200, 760, $true) | Out-Null
Start-Sleep -Seconds 1

$r = New-Object WP+RECT
[WP]::GetWindowRect($h, [ref]$r) | Out-Null
$w = $r.R - $r.L
$hi = $r.B - $r.T
Write-Host "Janela agora: ${w}x${hi}"

$bmp = New-Object System.Drawing.Bitmap $w, $hi
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
[WP]::PrintWindow($h, $hdc, 2) | Out-Null
$g.ReleaseHdc($hdc)
$out = "E:\Projetos\LOPES FOCUS\docs\app-print-v0.2.7.png"
$bmp.Save($out)
$g.Dispose(); $bmp.Dispose()
Write-Output "screenshot salvo: $out (${w}x${hi})"
