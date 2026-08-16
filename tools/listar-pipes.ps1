[System.IO.Directory]::GetFiles("\\.\pipe\") | Where-Object { $_ -match "neutralino" -or $_ -match "27476" } | ForEach-Object { $_.Substring(8) }
