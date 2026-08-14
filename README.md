# dsh-telegram-channel

[English](#english) · [中文](#中文)

Telegram **手机遥控器** for DeepSeek Harness：附着本机正在跑的 Web 会话，与电脑 **同轨迹、双向可见**（Codex-style）。

**Keywords：** Telegram · Bot · Mobile · Remote · DSH · Cordis · dsh-plugin · sessions · bind

---

## 中文

### 30 秒理解

1. 电脑 `dsh web` 开着，并打开一个对话  
2. 手机 Bot 发 `/sessions`，点选该对话  
3. 之后手机 ↔ Web 走**同一条**轨迹

---

### 一键安装（推荐）

**先准备两样东西：**

| 准备 | 怎么拿 |
|---|---|
| Bot Token | Telegram 搜 `@BotFather` → `/newbot` → 复制 token |
| 数字 User ID | 搜 `@userinfobot` → Start → 复制纯数字 |

> Token 不要发到公开群；泄露了去 BotFather `/revoke`。

#### Windows

> 下面命令请在 **PowerShell** 里执行（开始菜单搜 “Windows PowerShell” / “终端”）。  
> 若窗口标题是 **命令提示符 / CMD**，先输入 `powershell` 回车，再贴命令。

**方式 A — 远程一键（交互输入 Token / User ID）：**

```powershell
irm https://raw.githubusercontent.com/hi-wenw/dsh-telegram-channel/master/scripts/install.ps1 | iex
```

等价写法（更不易混淆）：

```powershell
Invoke-RestMethod https://raw.githubusercontent.com/hi-wenw/dsh-telegram-channel/master/scripts/install.ps1 | Invoke-Expression
```

**CMD 用户一键进入并执行：**

```bat
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/hi-wenw/dsh-telegram-channel/master/scripts/install.ps1 | iex"
```

**方式 B — 带参数（不交互）：**

```powershell
git clone https://github.com/hi-wenw/dsh-telegram-channel.git
cd dsh-telegram-channel
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Token '这里粘贴Token' -UserId '这里粘贴数字ID'
```

脚本会自动：

1. 写入用户环境变量 `DSH_TELEGRAM_TOKEN`、`DSH_TELEGRAM_ALLOWED_USER_IDS`  
2. 给 profile 补上 `allowBuilds`（防止 pnpm 拦截）  
3. 执行 `dsh plugin --profile web add github:hi-wenw/dsh-telegram-channel`  

**不会**再 `insert` 同名插件行（避免 `duplicate loader entry id`）。

#### macOS / Linux

```bash
export DSH_TELEGRAM_TOKEN='你的Token'
export DSH_TELEGRAM_ALLOWED_USER_IDS='你的数字ID'
curl -fsSL https://raw.githubusercontent.com/hi-wenw/dsh-telegram-channel/master/scripts/install.sh | bash
```

或克隆后：`./scripts/install.sh --token '...' --user-id '...'`

---

### 安装后只用三步

```powershell
# 1. 关掉旧终端，新开一个，然后：
dsh web

# 2. 浏览器打开一个对话（保持运行）

# 3. 手机对 Bot：
#    /start  →  /sessions  →  点选  →  正常聊天
```

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

### 许可证

[MIT](LICENSE)

---

## English

### What this is

Telegram **mobile remote** for **live** DeepSeek Harness Web agents. Desktop/Web is the source of truth; the phone **attaches** (no parallel hidden agent).

### One-click install (Windows)

```powershell
irm https://raw.githubusercontent.com/hi-wenw/dsh-telegram-channel/master/scripts/install.ps1 | iex
```

Or with params after clone:

```powershell
.\scripts\install.ps1 -Token '...' -UserId '123456789'
```

The script sets user env vars, ensures `allowBuilds`, and runs `dsh plugin add`. Then:

```powershell
dsh web
# open a Web chat → phone: /sessions → bind
```

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

### License

MIT
