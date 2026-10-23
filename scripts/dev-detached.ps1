# Starts the Next.js dev server as a detached Windows process so it keeps
# running after the terminal/WSL shell that launched it exits.
#
#   powershell -ExecutionPolicy Bypass -File scripts\dev-detached.ps1 [-Port 3000]
param([int]$Port = 3000)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$node = "C:\Program Files\nodejs\node.exe"
$next = Join-Path $root "node_modules\next\dist\bin\next"
$logDir = Join-Path $root ".data"
$outLog = Join-Path $logDir "dev.out.log"
$errLog = Join-Path $logDir "dev.err.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  Write-Output "Port $Port is already in use (PID $($listener[0].OwningProcess)). Not starting another server."
  exit 0
}

# Next 16 refuses to start when a stale .next\dev\lock from a dead server is
# left behind, so drop it once nothing is listening.
$lock = Join-Path $root ".next\dev\lock"
if (Test-Path $lock) { Remove-Item $lock -Force }

Start-Process -FilePath $node `
  -ArgumentList "`"$next`"", "dev", "--webpack", "--port", "$Port" `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog | Out-Null

Write-Output "Started on http://localhost:$Port (logs: $outLog)"
