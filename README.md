# dsh-telegram-channel

[English](#english) · [中文](#中文)

**Keywords / 关键词：** Telegram · Bot · Mobile · Channel · Remove · Clear · Delete session · DeepSeek Harness · DSH · Cordis · dsh-plugin · Agent · Remote · Long polling · Allowlist · 手机 · 远程 · 机器人 · 渠道 · 会话 · 新对话 · 清除 · 删除 · 白名单 · 长轮询

DeepSeek Harness（DSH）Telegram **Bot / Channel** Cordis 插件：用手机 Telegram 远程驱动本机 Agent。长轮询 Bot API，按聊天独立会话，助手回复 HTML 分片回传。`dsh plugin add` 安装，约 10 分钟连通。

---

## 中文

### 这是什么

把 **Telegram Bot** 接到 **DeepSeek Harness**，让你可以在 **手机（mobile）** 上发消息，本机 DSH agent 执行并回复。适合远程 coding agent、远程运维对话、随身 Bot 入口。

相关搜索词：`telegram bot`、`dsh telegram`、`deepseek harness mobile`、`telegram channel plugin`、`/new` `/clear` `/remove` 会话、白名单 bot。

### 特性

- 标准 Cordis **dsh-plugin**（`inject: ['agents']`），`cordis.patch.yml` 挂入 profile
- Telegram **长轮询** `getUpdates`，无需公网 webhook
- 每 chat 一个 agent；`/new`、`/clear` **清除 / 删除**当前会话后重建
- **白名单**鉴权（fail-closed）；鉴权与命令默认中文
- Markdown 子集 → Telegram HTML，超长自动分片；HTML 失败降级纯文本
- 无 token 时软失败：打日志、不启轮询，不拖垮整个 profile

### 前置条件

| 项 | 要求 |
|---|---|
| Node.js | ≥ 22 |
| DeepSeek Harness | 目标 profile（如 `dsh web`）可运行，API Key 等已按官方配置 |
| Telegram Bot | [@BotFather](https://t.me/BotFather) 创建 bot，取得 token |
| 用户 ID | [@userinfobot](https://t.me/userinfobot) 等获取 numeric user id |

### 连接实操（约 10 分钟）

按下面顺序做即可完成 **Telegram Bot ↔ DSH** 连通：

1. 本机确认 `dsh web`（或你的 profile）能正常启动。
2. BotFather 创建 bot，复制 **token**；userinfobot 记下自己的 **user id**。
3. 安装插件（推荐 GitHub）：

```powershell
dsh plugin --profile web add github:hi-wenw/dsh-telegram-channel
```

本地开发目录安装：

```powershell
dsh plugin --profile web add D:\gitData\dsh-telegram-channel
```

4. 设置 token（推荐环境变量，避免写进仓库）：

```powershell
$env:DSH_TELEGRAM_TOKEN = '123456:ABC...'
```

5. 在 profile 的 patch / 插件配置里设置白名单（把数字换成你的 id）：

```yaml
- insert:
    - id: dsh-telegram-channel
      name: dsh-telegram-channel
      config:
        token: ''
        allowedUserIds: [123456789]
        provider: deepseek-official
        model: deepseek-v4-flash
```

也可参考 [`examples/telegram-agent/`](examples/telegram-agent/)。

6. **重新加载或重启** profile，使配置生效。
7. 手机打开 Telegram，向该 **Bot** 发送：
   - `/start` — 欢迎
   - 任意一句话 — 应收到 agent 回复
   - `/new` 或 `/clear` — **清除会话**后重新对话
   - `/help` — 命令说明

### 配置项

| 键 | 默认 | 含义 |
|---|---|---|
| `token` | `''`（空则读 `DSH_TELEGRAM_TOKEN`） | BotFather bot token |
| `allowedUserIds` | `[]` | 允许对话的 Telegram user id；**空且 `allowAllUsers: false` = 全拒** |
| `allowAllUsers` | `false` | `true` 时忽略白名单（仅本地调试） |
| `provider` | `deepseek-official` | agent 的 LLM provider |
| `model` | `deepseek-v4-flash` | 模型 id |
| `maxMessageLength` | `4096` | 单条消息长度上限 |
| `pollingTimeoutSec` | `30` | 长轮询超时（秒） |
| `cwd` | 进程 cwd | agent 工作目录 |

### Bot 命令

| 命令 | 行为 |
|---|---|
| `/start` | 欢迎与用法；不调模型 |
| `/help` | 命令与白名单 / 会话说明 |
| `/new` 或 `/clear` | **清除 / 删除**当前 chat 的 agent，下次消息重建（等同 reset / remove session） |
| 未识别 `/...` | 提示可用命令 |
| 普通文本 | `create` / `followup` → 回传助手文本 |

### 故障排查

| 现象 | 可能原因 | 处理 |
|---|---|---|
| 日志 `missing bot token`；Bot 无响应 | 未设 `token` / `DSH_TELEGRAM_TOKEN` | 设置后重载 profile |
| 回复「无权限。」 | user id 不在白名单，或名单为空 | 核对 id，写入 `allowedUserIds` |
| Telegram 401 | token 错误或已撤销 | BotFather 换新 token |
| 有 typing 无文字 | profile 内 LLM / API Key | 查 DSH 日志；同 profile 先用 CLI 验证 agent |
| 重启后对话「失忆」 | 会话仅内存（当前设计） | 直接发消息或 `/new` 重建 |
| 贡献者 `npm install` peer 冲突 | 上游 DSH RC `dsh-invariants` 未对齐 | `npm install --legacy-peer-deps` |

### 路线图

1. 运维键盘：新对话 / 状态 / 停止 / 更多
2. 同消息编辑流式、阶段摘要
3. chat↔session 跨重启持久化
4. cwd / 项目切换
5. Telegram 侧切换 provider / model
6. 媒体（图片等，依赖 profile 能力）
7. 可选 webhook

### 安全

- Fail-closed 白名单；空名单默认全拒
- Token 优先环境变量；日志脱敏
- `allowAllUsers: true` 勿用于生产
- 本插件不启 LLM；模型 / 工具 / 沙箱由 DSH profile 决定

### 贡献者

```powershell
git clone https://github.com/hi-wenw/dsh-telegram-channel.git
cd dsh-telegram-channel
npm install --legacy-peer-deps
npm test
npm run build
```

### 验证状态

| 项 | 值 |
|---|---|
| 包版本 | `0.1.0` |
| 日期 | 2026-08-14 |
| 自动化 | `npm test` 25/25 · `npm run build` |
| Peer | `@deepseek-ai/cordis` ^4.0.1 · `dsh-agent` ^0.1.0-rc.6 · `dsh-llm` ^0.0.1-rc.1 · `dsh-session` ^0.0.1-rc.1 |

### 许可证

[MIT](LICENSE)

---

## English

### What this is

A **DeepSeek Harness (DSH) Cordis channel plugin** that turns a **Telegram Bot** into a **mobile / remote** front-end for your local agent. Long-polling Bot API, one agent session per chat, HTML-split replies. Install with `dsh plugin add`; connect in about 10 minutes.

**Search keywords:** telegram bot, telegram channel, mobile agent, remote bot, deepseek harness, dsh-plugin, cordis plugin, remove session, clear chat, `/new`, `/clear`, allowlist, long polling.

### Features

- Standard **dsh-plugin** (`inject: ['agents']`) via `cordis.patch.yml`
- Telegram **long polling** (`getUpdates`) — no public webhook required
- Per-chat agent; `/new` and `/clear` **remove / reset / delete** the session
- Fail-closed **allowlist**; Chinese copy for auth/commands by default
- Markdown subset → Telegram HTML with chunking; plain-text fallback
- Missing token soft-fail: log and skip polling (does not crash the profile)

### Prerequisites

| Item | Requirement |
|---|---|
| Node.js | ≥ 22 |
| DeepSeek Harness | Target profile (e.g. `dsh web`) runs with API keys configured |
| Telegram Bot | Create via [@BotFather](https://t.me/BotFather), copy token |
| User id | Numeric id from [@userinfobot](https://t.me/userinfobot) (etc.) |

### Connect walkthrough (~10 minutes)

1. Confirm `dsh web` (or your profile) starts on the machine.
2. Create a **Telegram Bot**, copy **token**; note your **user id**.
3. Install the plugin:

```powershell
dsh plugin --profile web add github:hi-wenw/dsh-telegram-channel
```

Local path:

```powershell
dsh plugin --profile web add D:\gitData\dsh-telegram-channel
```

4. Set the token (prefer env):

```powershell
$env:DSH_TELEGRAM_TOKEN = '123456:ABC...'
```

5. Allowlist your user id in the profile patch:

```yaml
- insert:
    - id: dsh-telegram-channel
      name: dsh-telegram-channel
      config:
        token: ''
        allowedUserIds: [123456789]
        provider: deepseek-official
        model: deepseek-v4-flash
```

See also [`examples/telegram-agent/`](examples/telegram-agent/).

6. **Reload or restart** the profile.
7. On your **phone**, open Telegram and message the **Bot**:
   - `/start` — welcome
   - any text — agent reply
   - `/new` or `/clear` — **remove / clear** session, then chat again
   - `/help` — commands

### Configuration

| Key | Default | Meaning |
|---|---|---|
| `token` | `''` (falls back to `DSH_TELEGRAM_TOKEN`) | BotFather token |
| `allowedUserIds` | `[]` | Allowed Telegram user ids; **empty + `allowAllUsers: false` rejects all** |
| `allowAllUsers` | `false` | Ignore allowlist (local debug only) |
| `provider` | `deepseek-official` | LLM provider for created agents |
| `model` | `deepseek-v4-flash` | Model id |
| `maxMessageLength` | `4096` | Max Telegram message length |
| `pollingTimeoutSec` | `30` | Long-poll timeout (seconds) |
| `cwd` | process cwd | Agent working directory |

### Bot commands

| Command | Behavior |
|---|---|
| `/start` | Welcome; no model call |
| `/help` | Commands + allowlist / session notes |
| `/new` or `/clear` | **Remove / clear / reset** this chat’s agent; next message creates a new session |
| Unknown `/...` | Hint available commands |
| Plain text | `create` / `followup` → assistant text |

### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Log `missing bot token`; silent Bot | No `token` / `DSH_TELEGRAM_TOKEN` | Set env or config, reload profile |
| Reply「无权限。」 / Access denied | User not on allowlist or empty list | Fix `allowedUserIds` |
| Telegram 401 | Bad/revoked token | New token from BotFather |
| Typing but no text | LLM / API Key in profile | Check DSH logs; verify agent in same profile |
| Amnesia after restart | In-memory sessions by design | Send a message or `/new` |
| Contributor `npm install` peer conflict | Upstream DSH RC pins | `npm install --legacy-peer-deps` |

### Roadmap

1. Ops keyboard (new / status / stop / more)
2. In-place streaming edits
3. Persist chat↔session across restarts
4. cwd / project switch
5. Switch provider/model from Telegram
6. Media (images) when profile supports it
7. Optional webhook

### Security

- Fail-closed allowlist
- Prefer env for token; logs redact secrets
- Never enable `allowAllUsers` in production
- Plugin does not start the LLM; profile owns models/tools/sandbox

### Contributors

```powershell
git clone https://github.com/hi-wenw/dsh-telegram-channel.git
cd dsh-telegram-channel
npm install --legacy-peer-deps
npm test
npm run build
```

### Verification

| Item | Value |
|---|---|
| Package | `0.1.0` |
| Date | 2026-08-14 |
| Automated | `npm test` 25/25 · `npm run build` |
| Peers | `@deepseek-ai/cordis` ^4.0.1 · `dsh-agent` ^0.1.0-rc.6 · `dsh-llm` ^0.0.1-rc.1 · `dsh-session` ^0.0.1-rc.1 |

### License

[MIT](LICENSE)
