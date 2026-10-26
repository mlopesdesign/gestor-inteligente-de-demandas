Get-Process | Where-Object {$_.Name -like 'Gestor*'} | Select-Object Id, Name, Path, StartTime, MainWindowTitle | Format-List
