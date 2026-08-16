# tools/find-carregando.ps1
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WG {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc p, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder t, int m);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  public delegate bool EnumWindowsProc(IntPtr h, IntPtr l);
}
"@

[WG]::EnumWindows({
  param($h, $l)
  $sb = New-Object System.Text.StringBuilder 256
  [WG]::GetWindowText($h, $sb, 256) | Out-Null
  $title = $sb.ToString()
  $procId = 0
  [WG]::GetWindowThreadProcessId($h, [ref]$procId) | Out-Null
  if ($title -match "Carregando|Gestor Intel") {
    Write-Output "hwnd=$h pid=$procId title='$title'"
  }
  return $true
}, [IntPtr]::Zero) | Out-Null
