# dsh-telegram-channel

[English](#english) · [中文](#中文)

**Keywords / 关键词：** Telegram · Bot · Mobile · Remote · Channel · Sessions · Bind · Unbind · Remove · Clear · DeepSeek Harness · DSH · Cordis · dsh-plugin · Agent · Live session · 手机 · 远程 · 遥控器 · 会话列表 · 附着 · 解绑 · 白名单

DeepSeek Harness **手机遥控器**：用 Telegram Bot **附着本机正在运行的 Web 会话**（与 Web **同轨迹、双向可见**）。对标 Codex phone remote——本机会话是真相源，手机不另开平行对话。

---

## 中文

### 这是什么

| | 旧「平行桥」 | **本插件（当前）** |
|---|---|---|
| 会话 | Telegram 专用新建 agent | 附着 `dsh web` 里 **live** agent |
| Web | 不通 | 手机与 Web **同一条轨迹** |

流程：电脑上先开对话 → 手机 `/sessions` 选择 → 发消息进入该会话 → Web 也能看到。

### 连接实操（约 10 分钟）

1. 本机 `dsh web` 能跑，并 **先打开至少一个对话**（保持运行）。
2. [@BotFather](https://t.me/BotFather) 建 Bot，拿 token；[@userinfobot](https://t.me/userinfobot) 拿自己的 user id。
3. 安装：

```powershell
dsh plugin --profile web add github:hi-wenw/dsh-telegram-channel
```

或本地：

```powershell
dsh plugin --profile web add D:\gitData\dsh-telegram-channel
```

4. Token（推荐环境变量）：

```powershell
$env:DSH_TELEGRAM_TOKEN = '123456:ABC...'
```

5. 白名单（换成你的 id）：

```yaml
- insert:
    - id: dsh-telegram-channel
      name: dsh-telegram-channel
      config:
        token: ''
        allowedUserIds: [123456789]
```

6. **重启 / 重载** profile。
7. 手机 Telegram：
   - `/start`
   - `/sessions` → 点选本机会话
   - 发一句话 → Web 与手机构应出现同一轮问答
   - `/unbind` 仅断开手机绑定，不关本机会话

### 命令

| 命令 | 行为 |
|---|---|
| `/sessions` `/list` | 列出 live 会话，内联键盘选择附着 |
| `/status` | 当前绑定 |
| `/unbind` `/disconnect` | 解绑（不 dispose 本机 agent） |
| `/help` `/start` | 帮助 / 欢迎 |
| 普通文字 | 进入已绑定会话的 `followup` |

### 配置

| 键 | 默认 | 含义 |
|---|---|---|
| `token` | 空 → `DSH_TELEGRAM_TOKEN` | Bot token |
| `allowedUserIds` | `[]` | 白名单；空 = 全拒 |
| `allowAllUsers` | `false` | 调试用，生产勿开 |
| `maxMessageLength` | `4096` | 分片长度 |
| `pollingTimeoutSec` | `30` | 长轮询超时 |

### 故障排查

| 现象 | 处理 |
|---|---|
| `/sessions` 提示没有会话 | 先在 Web 打开对话并保持 profile 运行 |
| 「尚未绑定」 | 先 `/sessions` 点选 |
| 「会话已不在本机运行」 | Web 已关该会话；重新开再绑定 |
| 「无权限」 | 检查 `allowedUserIds` |
| missing bot token | 设 `DSH_TELEGRAM_TOKEN` 后重载 |

### 安全

Fail-closed 白名单；token 走环境变量；日志脱敏；解绑不关闭本机 agent。

### 贡献者

```powershell
git clone https://github.com/hi-wenw/dsh-telegram-channel.git
cd dsh-telegram-channel
npm install --legacy-peer-deps
npm test
npm run build
```

### 许可证

[MIT](LICENSE)

---

## English

### What this is

A **DeepSeek Harness Cordis plugin** that turns Telegram into a **mobile remote** for **live** agents in the same `dsh web` process. The desktop/Web session is the source of truth (Codex-style remote). Telegram **attaches**; it does **not** spawn a parallel hidden agent.

### Connect walkthrough

1. Run `dsh web` and **open at least one conversation**.
2. Create a Bot (BotFather) + note your user id.
3. Install:

```powershell
dsh plugin --profile web add github:hi-wenw/dsh-telegram-channel
```

4. `$env:DSH_TELEGRAM_TOKEN = '...'`
5. Set `allowedUserIds` in the plugin patch.
6. Reload the profile.
7. On your phone: `/sessions` → tap a live session → send text → same turn appears on Web and Telegram. `/unbind` detaches only.

### Commands

| Command | Action |
|---|---|
| `/sessions` `/list` | List live agents; inline keyboard to bind |
| `/status` | Show binding |
| `/unbind` `/disconnect` | Unbind (does not dispose host agent) |
| Plain text | `followup` into the bound live agent |

### License

MIT
