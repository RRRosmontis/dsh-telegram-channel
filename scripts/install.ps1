#Requires -Version 5.1
<#
.SYNOPSIS
  One-click install for dsh-telegram-channel (DeepSeek Harness Telegram remote).

.DESCRIPTION
  1) Writes user env: DSH_TELEGRAM_TOKEN + DSH_TELEGRAM_ALLOWED_USER_IDS
  2) Ensures allowBuilds for the plugin (belt-and-suspenders)
  3) Runs: dsh plugin --profile <name> add <source>
  Does NOT edit cordis.patch.yml (avoids duplicate loader entry).

.EXAMPLE
  # Interactive (prompts for token + user id)
  irm https://raw.githubusercontent.com/hi-wenw/dsh-telegram-channel/master/scripts/install.ps1 | iex

.EXAMPLE
  .\scripts\install.ps1 -Token '123:AA...' -UserId '7057906059'

.EXAMPLE
  # Install from this cloned repo instead of GitHub
  .\scripts\install.ps1 -Token '...' -UserId '...' -Local
#>
[CmdletBinding()]
param(
  [string] $Token = $env:DSH_TELEGRAM_TOKEN,
  [string] $UserId = $env:DSH_TELEGRAM_ALLOWED_USER_IDS,
  [string] $ProfileName = 'web',
  [string] $Source = 'github:hi-wenw/dsh-telegram-channel',
  [switch] $Local,
  [switch] $NoPersist
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step([string] $Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Ensure-Command([string] $Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "找不到命令 '$Name'。请先安装并确保 DeepSeek Harness CLI（dsh）在 PATH 中。"
  }
}

function Set-UserEnv([string] $Name, [string] $Value) {
  Set-Item -Path "Env:$Name" -Value $Value
  if (-not $NoPersist) {
    [Environment]::SetEnvironmentVariable($Name, $Value, 'User')
  }
}

function Ensure-AllowBuilds([string] $ProfileDir) {
  $path = Join-Path $ProfileDir 'pnpm-workspace.yaml'
  $block = @'
allowBuilds:
  dsh-telegram-channel: true
'@
  if (-not (Test-Path -LiteralPath $path)) {
    $content = @"
packages:
  - .

nodeLinker: hoisted
autoInstallPeers: false

$block
"@
    Set-Content -LiteralPath $path -Value $content -Encoding utf8
    Write-Host "已创建 $path （allowBuilds）"
    return
  }

  $raw = Get-Content -LiteralPath $path -Raw
  if ($raw -match '(?m)^\s*dsh-telegram-channel\s*:\s*true\s*$') {
    Write-Host "allowBuilds 已存在，跳过"
    return
  }

  if ($raw -match '(?m)^allowBuilds\s*:') {
    if ($raw -notmatch '(?m)^allowBuilds\s*:[\s\S]*?dsh-telegram-channel\s*:') {
      $raw = $raw -replace '(?m)^(allowBuilds\s*:)', "`$1`r`n  dsh-telegram-channel: true"
      $out = ($raw.TrimEnd() + "`r`n")
      Set-Content -LiteralPath $path -Value $out -Encoding utf8
      Write-Host "已写入 allowBuilds.dsh-telegram-channel → $path"
    }
    return
  }

  Add-Content -LiteralPath $path -Value "`r`n$block`r`n" -Encoding utf8
  Write-Host "已追加 allowBuilds → $path"
}

Write-Host "dsh-telegram-channel installer" -ForegroundColor Green
Write-Host "Profile: $ProfileName"

Ensure-Command 'dsh'

if (-not $Token) {
  $Token = Read-Host '粘贴 BotFather 的 Bot Token（不要发到公开群）'
}
$Token = ([string]$Token).Trim()
if (-not $Token) { throw '缺少 Bot Token。' }

if (-not $UserId) {
  $UserId = Read-Host '粘贴你的 Telegram 数字 User ID（@userinfobot）'
}
$UserId = ([string]$UserId).Trim()
if ($UserId -notmatch '^\d+(?:\s*,\s*\d+)*$') {
  throw "User ID 必须是数字（多个用逗号分隔），收到: '$UserId'"
}
$UserId = ($UserId -replace '\s+', '')

Write-Step '写入用户环境变量（当前进程 + 用户级永久）'
Set-UserEnv 'DSH_TELEGRAM_TOKEN' $Token
Set-UserEnv 'DSH_TELEGRAM_ALLOWED_USER_IDS' $UserId
Write-Host "DSH_TELEGRAM_TOKEN = (已设置，长度 $($Token.Length))"
Write-Host "DSH_TELEGRAM_ALLOWED_USER_IDS = $UserId"
if ($NoPersist) {
  Write-Host '（-NoPersist：未写入用户级环境变量）' -ForegroundColor Yellow
} else {
  Write-Host '已写入用户级环境变量。请关闭旧终端后再开新的。' -ForegroundColor Yellow
}

$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$profileDir = Join-Path $dshHome "profiles\$ProfileName"
if (-not (Test-Path -LiteralPath $profileDir)) {
  throw "找不到 profile 目录: $profileDir （请先成功跑过一次 dsh web）"
}

Write-Step '确保 pnpm allowBuilds（防止 git 依赖 prepare 被拦）'
Ensure-AllowBuilds $profileDir

if ($Local) {
  $scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
  $repoRoot = Resolve-Path (Join-Path $scriptRoot '..')
  $Source = $repoRoot.Path
}

Write-Step "安装插件: dsh plugin --profile $ProfileName add $Source"
& dsh plugin --profile $ProfileName add $Source
if ($LASTEXITCODE -ne 0) {
  throw "dsh plugin add 失败（exit=$LASTEXITCODE）。可尝试: dsh plugin --profile $ProfileName remove dsh-telegram-channel 后再跑本脚本。"
}

Write-Host ""
Write-Host '安装完成。接下来：' -ForegroundColor Green
Write-Host '  1. 关掉所有旧终端，新开 PowerShell'
Write-Host '  2. 确认代理（若需要访问 Telegram）已开启'
Write-Host '  3. 运行:  dsh web'
Write-Host '  4. 浏览器打开一个对话'
Write-Host '  5. 手机对 Bot 发 /start → /sessions → 点选附着'
Write-Host ""
Write-Host '命令菜单应出现: /start /sessions /status /unbind /help'
