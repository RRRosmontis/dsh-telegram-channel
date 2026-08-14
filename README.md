# dsh-telegram-channel

[English](#english) · [中文](#中文)

Telegram **手机遥控器** for DeepSeek Harness：附着本机正在跑的 Web 会话，与电脑 **同轨迹、双向可见**（Codex-style）。

**发现：** [dsh-plugin topic](https://github.com/topics/dsh-plugin) · 安装：`dsh plugin --profile web add github:hi-wenw/dsh-telegram-channel`

**Keywords：** Telegram · Bot · Mobile · Remote · DSH · Cordis · dsh-plugin · sessions · bind

---

## 中文

### 使用前需要什么

| 需要 | 说明 |
|---|---|
| DeepSeek Harness（`dsh`） | 本机已能跑通 `dsh web` |
| Node.js | 跟 Harness 走，建议 ≥22 |
| Telegram Bot Token | `@BotFather` → `/newbot` |
| 数字 User ID | `@userinfobot` |
| 代理（可选） | 若直连不上 `api.telegram.org`，需本机 HTTP(S)_PROXY |

**不需要 Python。**

---

### 30 秒理解

1. 电脑 `dsh web` 开着，并打开一个对话  
2. 手机 Bot 发 `/sessions`，点选该对话  
3. 之后手机 ↔ Web 走**同一条**轨迹

### 效果截图

手机选择会话并发问：

![手机 Telegram：选择会话并对话](docs/screenshots/mobile-chat.jpg)

电脑 Web 同步收到同一条消息与回复：

![电脑 DSH Web：同轨迹同步](docs/screenshots/desktop-sync.jpg)

---

### 一键管理菜单（推荐）

**先准备两样东西：**

| 准备 | 怎么拿 |
|---|---|
| Bot Token | Telegram 搜 `@BotFather` → `/newbot` → 复制 token |
| 数字 User ID | 搜 `@userinfobot` → Start → 复制纯数字 |

> Token 不要发到公开群；泄露了去 BotFather `/revoke`。

#### Windows

> 请在 **PowerShell** 执行。若当前是 **CMD**，用下面「CMD 一键」那行。

```powershell
irm https://raw.githubusercontent.com/hi-wenw/dsh-telegram-channel/master/scripts/install.ps1 | iex
```

> 脚本已兼容 `irm | iex`（菜单逻辑包在 scriptblock 里）。CMD 请用下面整行。

**CMD 一键：**

```bat
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/hi-wenw/dsh-telegram-channel/master/scripts/install.ps1 | iex"
```

备用（先下载再执行）：

```bat
powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr -UseBasicParsing https://raw.githubusercontent.com/hi-wenw/dsh-telegram-channel/master/scripts/install.ps1 -OutFile $env:TEMP\dsh-tg.ps1; & $env:TEMP\dsh-tg.ps1"
```

启动后用**数字**选择：

```
1) 安装 / 重装插件（写入 Token + 白名单）
2) 启动 dsh web（新窗口）
3) 停止 dsh web
4) 查看状态
5) 打开浏览器
0) 退出
```

也可直接指定动作（不进菜单）：

```powershell
.\scripts\install.ps1 -Action install -Token '...' -UserId '123456789'
.\scripts\install.ps1 -Action start
.\scripts\install.ps1 -Action stop
.\scripts\install.ps1 -Action status
```

安装时脚本会：写环境变量、补 `allowBuilds`、执行 `dsh plugin add`（**不会**再 insert 同名 id）。

#### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/hi-wenw/dsh-telegram-channel/master/scripts/install.sh | bash
# 同样出现数字菜单；或：
# ./scripts/install.sh install --token '...' --user-id '...'
# ./scripts/install.sh start|stop|status
```

---

### 手机怎么用

1. 菜单选 **2** 启动 `dsh web`（或自己运行 `dsh web`）  
2. 浏览器打开一个对话并保持运行  
3. 手机对 Bot：`/start` → `/sessions` → 点选 → 聊天  

输入框旁的 **/** 菜单应有：`start` `sessions` `status` `unbind` `help`。

| 命令 | 作用 |
|---|---|
| `/sessions` | 列出并附着本机 live 会话 |
| `/status` | 当前绑定 |
| `/unbind` | 只断开手机，**不关**电脑会话 |
| `/help` | 帮助 |

---

### 手工安装（可选）

若不想跑脚本：

```powershell
# 用户环境变量（或当前会话 $env:...）
# DSH_TELEGRAM_TOKEN = BotFather token
# DSH_TELEGRAM_ALLOWED_USER_IDS = 数字ID

dsh plugin --profile web add github:hi-wenw/dsh-telegram-channel
dsh web
```

本地目录安装：

```powershell
dsh plugin --profile web add D:\path\to\dsh-telegram-channel
```

需要改 YAML 白名单时，**只能按 id 覆盖**，不要再 `insert` 同名 id：

```yaml
- id: dsh-telegram-channel
  config:
    token: ""
    allowedUserIds: [123456789]
```

示例：`examples/telegram-agent/cordis.patch.example.yml`。

---

### 配置

| 键 / 环境变量 | 含义 |
|---|---|
| `token` / `DSH_TELEGRAM_TOKEN` | Bot token |
| `allowedUserIds` / `DSH_TELEGRAM_ALLOWED_USER_IDS` | 白名单；都空 = 谁都不能用 |
| `allowAllUsers` | `true` 仅调试 |
| `maxMessageLength` | 默认 4096 |
| `pollingTimeoutSec` | 默认 30 |

若本机用了 HTTP(S)_PROXY 访问 Telegram，插件会自动走代理（无需再设 `NODE_USE_ENV_PROXY`）。

---

### 故障排查

| 现象 | 处理 |
|---|---|
| `allowBuilds` / `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED` | 再跑一遍安装脚本，或手工在 `~\.dsh\profiles\web\pnpm-workspace.yaml` 加 `allowBuilds.dsh-telegram-channel: true` |
| `duplicate loader entry id: dsh-telegram-channel` | 用户 patch **不要 insert** 同名 id；用上面的 `- id:` 覆盖，或只用环境变量白名单 |
| 手机完全没回复 / ConnectTimeout | 打开本地代理（如 7890），重启 `dsh web` |
| `missing bot token` | 检查环境变量；**新开终端**再 `dsh web` |
| 「无权限」 | User ID 必须是 `@userinfobot` 的数字 |
| `/sessions` 无会话 | 先在 Web 打开对话 |
| Telegram 401 | Token 错了或被 revoke |

---

### 开发

```powershell
git clone https://github.com/hi-wenw/dsh-telegram-channel.git
cd dsh-telegram-channel
npm install --legacy-peer-deps
npm test
npm run build
```

### 发布与发现（社区插件）

社区发现入口主要是 GitHub topic，不是封闭应用商店审核：

1. 仓库 **公开**，`package.json` 声明 `dsh.bundle.patch`（本仓库已有）
2. About → Topics 加上 **`dsh-plugin`**（已加；可浏览 [topic 列表](https://github.com/topics/dsh-plugin)）
3. 用户安装：

```powershell
dsh plugin --profile web add github:hi-wenw/dsh-telegram-channel
```

4. 可选：收录到 [awesome-deepseek-harness](https://github.com/0xsline/awesome-deepseek-harness) 等精选列表；可选再发 npm

官方也建议插件作者使用 [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic 方便检索。

### 许可证

[MIT](LICENSE)

---

## English

### Prerequisites

- Working DeepSeek Harness (`dsh web`)
- Node.js (typically ≥22 with Harness)
- Telegram bot token + numeric user id
- Optional HTTP(S)_PROXY if Telegram API is blocked
- **No Python required**

### What this is

Telegram **mobile remote** for **live** DeepSeek Harness Web agents. Desktop/Web is the source of truth; the phone **attaches** (no parallel hidden agent).

### Screenshots

Phone: pick a live session and chat:

![Telegram mobile remote](docs/screenshots/mobile-chat.jpg)

Desktop Web shows the same trajectory:

![DSH Web synced](docs/screenshots/desktop-sync.jpg)

### One-click manager (Windows)

Run in **PowerShell** (not CMD). Opens a number menu: install / start / stop / status / open browser.

```powershell
irm https://raw.githubusercontent.com/hi-wenw/dsh-telegram-channel/master/scripts/install.ps1 | iex
```

CMD:

```bat
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/hi-wenw/dsh-telegram-channel/master/scripts/install.ps1 | iex"
```

Direct actions:

```powershell
.\scripts\install.ps1 -Action start
.\scripts\install.ps1 -Action stop
.\scripts\install.ps1 -Action install -Token '...' -UserId '123456789'
```

The script sets user env vars, ensures `allowBuilds`, and runs `dsh plugin add`. After **start**, open a Web chat → phone: `/sessions` → bind.

### Unix

```bash
export DSH_TELEGRAM_TOKEN='...'
export DSH_TELEGRAM_ALLOWED_USER_IDS='123456789'
curl -fsSL https://raw.githubusercontent.com/hi-wenw/dsh-telegram-channel/master/scripts/install.sh | bash
```

### Manual

```powershell
dsh plugin --profile web add github:hi-wenw/dsh-telegram-channel
```

Allowlist via `DSH_TELEGRAM_ALLOWED_USER_IDS` (preferred) or id-targeted YAML override — **never** re-`insert` the same plugin id.

### Discoverability

Listed under the public GitHub topic [`dsh-plugin`](https://github.com/topics/dsh-plugin). Install:

```powershell
dsh plugin --profile web add github:hi-wenw/dsh-telegram-channel
```

### License

MIT
