$dbPath = "C:\Users\66830\.gemini\antigravity\conversations\c74aae43-d550-455a-9839-b6e8603c874e.db"
$fs = New-Object System.IO.FileStream($dbPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
$bytes = New-Object byte[] $fs.Length
$fs.Read($bytes, 0, $fs.Length) | Out-Null
$fs.Close()

$text = [System.Text.Encoding]::ASCII.GetString($bytes)
$matches = [regex]::Matches($text, '[a-zA-Z_0-9\(\)\{\}\[\]\.,;:\-\+\=\*\/<>""''`\s]{4,}')
$lines = $matches | ForEach-Object { $_.Value.Trim() } | Where-Object { $_ -match "CREATE TABLE" -or $_ -match "project" -or $_ -match "conversation" }
$lines | Select-Object -Unique | Out-File -FilePath "C:\Users\66830\.gemini\antigravity\scratch\db_schema_hints.txt"
Write-Output "Done"
