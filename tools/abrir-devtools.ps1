# tools/abrir-devtools.ps1 - envia Ctrl+Shift+I pro app via SendKeys
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WP {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern int GetClassName(IntPtr hWnd, System.Text.StringBuilder lpClassName, int nMaxCount);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int hi, bool repaint);
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
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

$h = $script:hwnd_found
[WP]::ShowWindow($h, 9) | Out-Null
[WP]::SetForegroundWindow($h) | Out-Null
[WP]::MoveWindow($h, 100, 100, 1200, 760, $true) | Out-Null
Start-Sleep -Seconds 1
[System.Windows.Forms.SendKeys]::SendWait("^+I")
Start-Sleep -Seconds 1
Write-Output "DevTools enviado"
