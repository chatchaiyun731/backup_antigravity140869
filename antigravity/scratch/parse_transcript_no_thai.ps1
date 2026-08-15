$transcriptPath = "C:\Users\66830\.gemini\antigravity\brain\9c1ca343-8509-4b50-a0fa-b71254d57402\.system_generated\logs\transcript.jsonl"
$outputPath = "C:\Users\66830\.gemini\antigravity\scratch\asset_flow_conversation_history.md"

$lines = Get-Content -Path $transcriptPath -Encoding UTF8
$markdown = @()

$markdown += "# Conversation History: AssetFlow"
$markdown += ""

$turnCount = 1

foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    try {
        $obj = ConvertFrom-Json $line -ErrorAction Stop
    } catch {
        continue
    }
    
    if ($obj.type -eq "USER_INPUT") {
        $content = $obj.content
        $cleanContent = $content
        if ($content -match "<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>") {
            $cleanContent = $Matches[1].Trim()
        }
        
        $markdown += "## User Turn $turnCount"
        $markdown += $cleanContent
        $markdown += ""
        $markdown += "---"
        $markdown += ""
    } elseif ($obj.type -eq "PLANNER_RESPONSE" -and $obj.content) {
        $content = $obj.content.Trim()
        if ($content) {
            $markdown += "## AI Turn $turnCount"
            $markdown += $content
            $markdown += ""
            $markdown += "---"
            $markdown += ""
            $turnCount++
        }
    }
}

$markdown | Out-File -FilePath $outputPath -Encoding utf8
Write-Output "Done"
