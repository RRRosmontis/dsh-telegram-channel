# Telegram remote — example

Attach Telegram to **live** DSH Web sessions (same trajectory).

## Recommended: one-click

See root [README](../../README.md#一键安装推荐):

```powershell
irm https://raw.githubusercontent.com/hi-wenw/dsh-telegram-channel/master/scripts/install.ps1 | iex
```

Or from a clone:

```powershell
..\..\scripts\install.ps1 -Token '...' -UserId '123456789'
```

## Manual

```powershell
$env:DSH_TELEGRAM_TOKEN = '123456:ABC...'
$env:DSH_TELEGRAM_ALLOWED_USER_IDS = '123456789'
dsh plugin --profile web add github:hi-wenw/dsh-telegram-channel
```

Optional YAML allowlist (id override only — do **not** re-insert):  
[`cordis.patch.example.yml`](cordis.patch.example.yml)

Then: `dsh web` → phone `/sessions` → workspace → session → bind. Optional `/model`. `/unbind` disconnects phone only.
