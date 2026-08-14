# Telegram remote — example

Attach Telegram to **live** DSH Web sessions (same trajectory).

## Install

```powershell
dsh plugin --profile web add github:hi-wenw/dsh-telegram-channel
```

Local:

```powershell
dsh plugin --profile web add D:\gitData\dsh-telegram-channel
```

## Config

1. Open a conversation in `dsh web` first.
2. Set token:

```powershell
$env:DSH_TELEGRAM_TOKEN = '123456:ABC...'
```

3. Merge [`cordis.patch.example.yml`](cordis.patch.example.yml) (replace user id).
4. Reload profile.
5. Phone: `/sessions` → bind → chat. `/unbind` to disconnect.
