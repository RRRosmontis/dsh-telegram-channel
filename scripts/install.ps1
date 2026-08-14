#Requires -Version 5.1
# Bootstrap for dsh-telegram-channel manager.
# Safe for:  irm .../install.ps1 | iex
# (top-level param()/CmdletBinding cannot be used with Invoke-Expression)

$ErrorActionPreference = 'Stop'

$manageUrl = 'https://raw.githubusercontent.com/hi-wenw/dsh-telegram-channel/master/scripts/manage.ps1'
$tmp = Join-Path $env:TEMP 'dsh-telegram-channel-manage.ps1'

$local = $null
if ($PSScriptRoot) {
  $candidate = Join-Path $PSScriptRoot 'manage.ps1'
  if (Test-Path -LiteralPath $candidate) {
    $local = $candidate
  }
}

if ($local) {
  Write-Host ("Running local manager: " + $local) -ForegroundColor Cyan
  & $local @args
  exit $LASTEXITCODE
}

Write-Host 'Downloading manager script...' -ForegroundColor Cyan
Invoke-WebRequest -UseBasicParsing -Uri $manageUrl -OutFile $tmp
& $tmp @args
exit $LASTEXITCODE
