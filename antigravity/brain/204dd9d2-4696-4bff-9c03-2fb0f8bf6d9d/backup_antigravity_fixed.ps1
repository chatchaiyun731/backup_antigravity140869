# Updated PowerShell backup script using non-passphrase SSH key
# -------------------------------------------------------------
$repoUrl   = "git@github.com:chatchaiyun731/backup_antigravity140869.git"
$geminiDir = "$env:USERPROFILE\.gemini"
$tmpDir    = "$env:TEMP\antigravity_backup_export"

Write-Host "1/4 Cleaning temp folder..."
if (Test-Path $tmpDir) { Remove-Item -Recurse -Force $tmpDir }
New-Item -ItemType Directory -Path $tmpDir | Out-Null

Write-Host "2/4 Copying .gemini files..."
robocopy "$geminiDir" "$tmpDir" /MIR /XD "antigravity_backup_tmp" "antigravity_backup" /R:1 /W:1 | Out-Null

Write-Host "3/4 Initializing Git repository..."
Set-Location $tmpDir
git init -q
git config user.name "Antigravity Backup"
git config user.email "backup@antigravity.local"
git remote add origin $repoUrl

git add .
git commit -m "Backup Antigravity data $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -q

Write-Host "4/4 Pushing to GitHub via SSH..."
$env:GIT_SSH_COMMAND = 'ssh -i "C:\Users\66830\.gemini\antigravity\scratch\antigravity_backup\id_ed25519_nopass" -o StrictHostKeyChecking=no'
git push -u origin master --force

Write-Host "SUCCESS: Backup completed successfully!"
