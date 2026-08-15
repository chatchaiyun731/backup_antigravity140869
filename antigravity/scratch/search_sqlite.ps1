Get-ChildItem -Path "C:\Users\66830\.gemini\antigravity\scratch" -Filter "*sqlite*" -Recurse -Directory -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
Get-ChildItem -Path "C:\Users\66830\.gemini\antigravity\scratch" -Filter "*sql*" -Recurse -Directory -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
