# Runs the Gdje Večeras marketing agent team headlessly with Claude Code.
#   .\scripts\marketing-team.ps1                     # daily cycle (on Mondays: daily, then weekly)
#   .\scripts\marketing-team.ps1 -Cycle weekly       # weekly cycle only
#   .\scripts\marketing-team.ps1 -Agent cro          # one agent, daily
#   .\scripts\marketing-team.ps1 -Agent cro -Cycle weekly
# See RUNBOOK.md.
param(
  [ValidateSet('auto', 'daily', 'weekly')]
  [string]$Cycle = 'auto',
  [ValidateSet('', 'strategy', 'paid-measurement', 'sales-gtm', 'seo-content', 'content-copy', 'cro', 'growth-retention')]
  [string]$Agent = ''
)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$allowed = @(
  'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Agent', 'Skill', 'WebSearch', 'WebFetch',
  'Bash(git checkout -b marketing/*)', 'Bash(git switch -c marketing/*)', 'Bash(npm run lint)'
)

# Agents have no clock, so the run date, ISO week and start time come from here.
$now = Get-Date
# ISO week = week containing this week's Thursday (Windows PowerShell 5.1 has no ISOWeek class).
$thursday = $now.Date.AddDays(3 - (([int]$now.DayOfWeek + 6) % 7))
$isoYear = $thursday.Year
$isoWeek = [math]::Floor(($thursday.DayOfYear - 1) / 7) + 1
$runVars = "RUN_DATE=$($now.ToString('yyyy-MM-dd')) RUN_WEEK=$isoYear-W$($isoWeek.ToString('00')) RUN_STARTED=$($now.ToString('yyyy-MM-ddTHH:mm:sszzz'))"

function Invoke-Team([string]$prompt) {
  claude -p "$runVars. $prompt" --permission-mode acceptEdits --allowedTools $allowed
  if ($LASTEXITCODE -ne 0) { throw "Claude run failed (exit $LASTEXITCODE): $prompt" }
}

if ($Agent) {
  $c = if ($Cycle -eq 'auto') { 'daily' } else { $Cycle }
  Invoke-Team "Read .agents/marketing-team/ORCHESTRATOR.md and run cycle agent:$Agent ($c). Run only that agent, then report its DONE status and any open escalations."
  exit 0
}

$cycles = switch ($Cycle) {
  'daily'  { @('daily') }
  'weekly' { @('weekly') }
  default  { if ((Get-Date).DayOfWeek -eq 'Monday') { @('daily', 'weekly') } else { @('daily') } }
}

foreach ($c in $cycles) {
  Invoke-Team "Read .agents/marketing-team/ORCHESTRATOR.md and run the full $c cycle for today. Follow the wave order, run agents in parallel within a wave, wait for every DONE condition before the next wave, and end with the escalation summary."
}
