Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq 27476 } | Select-Object ProcessId, Name, CommandLine | Format-Table -AutoSize -Wrap
