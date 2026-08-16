# tools/listar-janelas.ps1 - lista todas as janelas do app
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WP {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, System.Text.StringBuilder lpClassName, int nMaxCount);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
}
"@

$pid_target = (Get-Process -Name "GestorInteligenteDeDemandas" -ErrorAction SilentlyContinue).Id | Select-Object -First 1
Write-Host "PID alvo: $pid_target"
Write-Host "---"

$callback = {
  param($h, $l)
  $p = 0
  [void][WP]::GetWindowThreadProcessId($h, [ref]$p)
  if ($p -eq $pid_target) {
    $sb = New-Object System.Text.StringBuilder(256)
    [void][WP]::GetWindowText($h, $sb, 256)
    $title = $sb.ToString()
    $cn = New-Object System.Text.StringBuilder(256)
    [void][WP]::GetClassName($h, $cn, 256)
    $class = $cn.ToString()
    $visible = [WP]::IsWindowVisible($h)
    $r2 = New-Object WP+RECT
    [void][WP]::GetWindowRect($h, [ref]$r2)
    $w2 = $r2.R - $r2.L
    $hi2 = $r2.B - $r2.T
    Write-Host ("hwnd=0x{0:X} class='{1}' title='{2}' visible={3} pos=({4},{5}) size={6}x{7}" -f $h.ToInt64(), $class, $title, $visible, $r2.L, $r2.T, $w2, $hi2)
  }
  return $true
}
[void][WP]::EnumWindows($callback, [IntPtr]::Zero)
