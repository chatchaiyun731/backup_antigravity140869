# PowerShell script to backup Antigravity data to GitHub via SSH
# -------------------------------------------------------------
# Prerequisites:
#   - SSH key added to your GitHub account (see instructions below).
#   - Repository created at https://github.com/chatchaiyun731/backup_antigravity140869
#   - Git installed and available in PATH.

$repoUrl = "git@github.com:chatchaiyun731/backup_antigravity140869.git"
$backupDir = "$env:USERPROFILE\.gemini"   # .gemini folder
$workDir  = "C:\Users\66830\.gemini\antigravity\scratch\antigravity_backup_tmp"

# Clean up any previous temp folder
if (Test-Path $workDir) { Remove-Item -Recurse -Force $workDir }
New-Item -ItemType Directory -Path $workDir | Out-Null

# Copy the .gemini folder (including hidden files) into temp folder
Write-Host "Copying .gemini data..."
robocopy "$backupDir" "$workDir" /MIR /R:2 /W:1 | Out-Null

# Initialise a new Git repo in the temp folder
Set-Location $workDir
git init -q

git remote add origin $repoUrl

# Add all files and commit
git add .
git commit -m "Backup Antigravity data $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -q

# Push to GitHub (force push to keep repository in sync)
Write-Host "Pushing backup to GitHub..."
# Use SSH agent; if you set a passphrase you may need to start ssh-agent beforehand.
git push -u origin master --force

Write-Host "Backup completed successfully."
