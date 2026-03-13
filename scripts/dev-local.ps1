$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Test-Http {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [int]$TimeoutSec = 3
  )

  try {
    Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec $TimeoutSec | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Wait-ForHttp {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [int]$MaxSeconds = 90
  )

  $deadline = (Get-Date).AddSeconds($MaxSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-Http -Url $Url -TimeoutSec 3) {
      return $true
    }
    Start-Sleep -Seconds 2
  }

  return $false
}

$apiUrl = 'http://localhost:4000/api/health'
$webUrl = 'http://localhost:3000'

$apiRunning = Test-Http -Url $apiUrl
$webRunning = Test-Http -Url $webUrl

$startedApi = $null
$startedWeb = $null

if (-not $apiRunning) {
  Write-Host '[local] Starting API (dev:api)...'
  $startedApi = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run', 'dev:api' -WorkingDirectory $repoRoot -PassThru
} else {
  Write-Host '[local] API already running on :4000'
}

if (-not $webRunning) {
  Write-Host '[local] Starting Web (dev:web)...'
  $startedWeb = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run', 'dev:web' -WorkingDirectory $repoRoot -PassThru
} else {
  Write-Host '[local] Web already running on :3000'
}

$apiReady = Wait-ForHttp -Url $apiUrl -MaxSeconds 120
$webReady = Wait-ForHttp -Url $webUrl -MaxSeconds 120

Write-Host ''
Write-Host '[local] Health check results:'
Write-Host "  API: $apiReady ($apiUrl)"
Write-Host "  WEB: $webReady ($webUrl)"

if ($startedApi) {
  Write-Host "[local] Started API PID: $($startedApi.Id)"
}
if ($startedWeb) {
  Write-Host "[local] Started Web PID: $($startedWeb.Id)"
}

if ($apiReady -and $webReady) {
  Write-Host '[local] Ready: open http://localhost:3000'
  exit 0
}

Write-Host '[local] One or more services failed to become healthy. Check running terminals/process logs.'
exit 1
