# dsh-telegram-channel

[English](#english) · [中文](#中文)

**Keywords / 关键词：** Telegram · Bot · Mobile · Remote · Channel · Sessions · Bind · Unbind · Remove · Clear · DeepSeek Harness · DSH · Cordis · dsh-plugin · Agent · Live session · 手机 · 远程 · 遥控器 · 会话列表 · 附着 · 解绑 · 白名单 · 安装

DeepSeek Harness **手机遥控器**：用 Telegram Bot **附着本机正在运行的 Web 会话**（与 Web **同轨迹、双向可见**）。对标 Codex phone remote——本机会话是真相源，手机不另开平行对话。

---

## 中文

### 这是什么（30 秒看懂）

1. 电脑上先用 `dsh web` 打开一个对话（保持开着）。
2. 手机 Telegram 找你的 Bot，发 `/sessions`，点选那个对话。
3. 之后手机发的话，会进**同一个**电脑会话；电脑上的回复，手机会同步看到。

| | 旧「平行桥」 | **本插件** |
|---|---|---|
| 会话 | Telegram 另开一个 agent | 附着电脑里 **正在跑的** 会话 |
| Web | 不通 | 手机与 Web **同一条轨迹** |

---

### 安装前请准备（缺一不可）

请用笔或备忘录记下三样东西：

| # | 准备什么 | 怎么拿 |
|---|---|---|
| 1 | 电脑已能打开 DeepSeek Harness 网页 | 终端运行 `dsh web`，浏览器能打开（常见 `http://127.0.0.1:3080`） |
| 2 | Telegram **Bot Token** | 手机打开 Telegram → 搜 `@BotFather` → `/newbot` 按提示创建 → 复制一长串类似 `123456:AA...` 的 token |
| 3 | 你的 Telegram **数字 User ID** | 搜 `@userinfobot` → 点 Start → 它会回复一串**纯数字**（不是 @用户名） |

> 安全提醒：Token 相当于钥匙，**不要发到公开群、不要提交到 GitHub**。若已泄露，去 BotFather 用 `/revoke` 作废并换新。

---

### 安装步骤（照着做即可）

下面假设你用 **Windows**，命令在 **PowerShell** 或 **CMD** 里执行。

#### 第 1 步：安装插件到 web 配置

打开终端，复制粘贴整行后回车：

```powershell
dsh plugin --profile web add github:hi-wenw/dsh-telegram-channel
```

**成功时**大致会看到安装完成、没有红色大段报错。

**如果报错出现 `allowBuilds` / `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`：**

1. 用记事本打开这个文件（没有就新建）：  
   `C:\Users\wenw\.dsh\profiles\web\pnpm-workspace.yaml`
2. 在文件里加入（或合并）下面内容（路径以报错里打印的为准；若报错给了更长一行，用报错那一行）：

```yaml
packages:
  - .

nodeLinker: hoisted
autoInstallPeers: false

allowBuilds:
  dsh-telegram-channel: true
```

3. 保存文件，再重新执行第 1 步那条 `dsh plugin ... add ...` 命令。

> 说明：从 **v0.2.1** 起，仓库已自带编译好的 `lib/`，一般**不需要**再改 `allowBuilds`。若你装到的仍是旧版缓存，可先执行下面「第 1b 步」再装。

#### 第 1b 步（可选）：清掉旧失败缓存后再装

若刚才失败过，可先：

```powershell
dsh plugin --profile web remove dsh-telegram-channel
```

然后再执行第 1 步。仍失败时，用本地目录安装（最稳）：

```powershell
git clone https://github.com/hi-wenw/dsh-telegram-channel.git D:\gitData\dsh-telegram-channel
dsh plugin --profile web add D:\gitData\dsh-telegram-channel
```

#### 第 2 步：设置 Bot Token（推荐环境变量）

**当前 PowerShell 窗口临时生效**（关窗口会丢，适合先试通）：

```powershell
$env:DSH_TELEGRAM_TOKEN = "这里粘贴你的BotFather_Token"
```

**想长期生效（用户级环境变量）**：

1. Win 键搜索「编辑系统环境变量」→「环境变量」。
2. 在「用户变量」点「新建」：
   - 变量名：`DSH_TELEGRAM_TOKEN`
   - 变量值：粘贴 BotFather 给你的 token
3. 确定保存后，**关掉所有旧终端**，新开一个终端。

#### 第 3 步：写入白名单（只允许你自己用）

打开（没有就新建）profile 补丁文件，常见路径：

`C:\Users\wenw\.dsh\profiles\web\cordis.patch.yml`

写入下面内容，把 `123456789` 换成你的 **数字 User ID**：

```yaml
- insert:
    - id: dsh-telegram-channel
      name: dsh-telegram-channel
      config:
        token: ""
        allowedUserIds: [123456789]
```

注意：

- `allowedUserIds` 里必须是**数字**，两边是方括号。
- `token: ""` 表示继续用环境变量里的 `DSH_TELEGRAM_TOKEN`（推荐）。
- 若插件安装时已经自动插入过同名行，不要重复两份；在已有行上改 `allowedUserIds` 即可。

也可用示例文件对照：仓库里的 `examples/telegram-agent/cordis.patch.example.yml`。

#### 第 4 步：启动（或重启）DSH Web

**重要：改完环境变量 / 补丁后，必须重新开一次 profile。**

```powershell
dsh web
```

等终端没有报错，浏览器能打开 Harness 页面。

#### 第 5 步：电脑上先开一个对话

在 Web 页面里 **新建或打开一个会话**，随便让它处于可用状态（这就是手机要遥控的「本机会话」）。

> 如果 Web 里一个会话都没有，手机发 `/sessions` 会提示「当前没有正在运行的本机会话」。

#### 第 6 步：手机连上 Bot

1. 打开 Telegram，搜索你创建的 Bot（BotFather 给你的名字）。
2. 点 **Start** / 发送 `/start`。
3. 发送 `/sessions`。
4. 点按钮，选择电脑上那个会话（「已附着…」）。
5. 发一句普通话，例如：`你好，请回复收到`。
6. 看手机是否收到回复，并回到电脑 Web：**应是同一条对话轨迹**。

常用命令：

| 命令 | 作用 |
|---|---|
| `/sessions` 或 `/list` | 列出本机 live 会话并选择附着 |
| `/status` | 看当前绑了谁 |
| `/unbind` 或 `/disconnect` | 断开手机绑定（**不关闭**电脑会话） |
| `/help` | 帮助 |

---

### 配置项一览

| 键 | 默认 | 含义 |
|---|---|---|
| `token` | 空 → 读 `DSH_TELEGRAM_TOKEN` | Bot token |
| `allowedUserIds` | `[]` | 白名单；空 = 谁都不能用 |
| `allowAllUsers` | `false` | `true` 时谁都能聊（仅调试） |
| `maxMessageLength` | `4096` | 单条消息分片长度 |
| `pollingTimeoutSec` | `30` | 长轮询超时（秒） |

---

### 故障排查（对照表）

| 你看到的现象 | 怎么处理 |
|---|---|
| `allowBuilds` / `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED` | 见上文「第 1 步」补 `pnpm-workspace.yaml`，或改用本地目录安装；并确认装的是 **v0.2.1+** |
| 日志 `missing bot token`；Bot 完全不说话 | 检查 `DSH_TELEGRAM_TOKEN` 是否设置；**新开终端**再 `dsh web` |
| 回复「无权限。」 | `allowedUserIds` 是否写错；必须是 @userinfobot 给的数字 ID |
| `/sessions` 说没有会话 | 先在 Web 打开对话并保持 `dsh web` 运行 |
| 「尚未绑定」 | 先 `/sessions` 点选 |
| 「会话已不在本机运行」 | Web 已关掉该会话；重新开再 `/sessions` |
| Telegram 401 | Token 错了或被 revoke；去 BotFather 换新 |

---

### 安全

- 白名单默认 **谁都不允许**，必须填你的 ID。
- Token 优先放环境变量，不要写进 Git。
- `/unbind` 只断开手机，不会结束电脑上的 agent。

### 贡献者开发

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

Telegram **mobile remote** for **live** DeepSeek Harness Web agents in the same `dsh web` process. Desktop/Web is the source of truth (Codex-style). Telegram **attaches**; it does not create a parallel hidden agent.

### Install (Windows)

1. Prerequisites: working `dsh web`, BotFather **token**, numeric Telegram **user id** (`@userinfobot`).
2. Install:

```powershell
dsh plugin --profile web add github:hi-wenw/dsh-telegram-channel
```

If pnpm prints `allowBuilds` / `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`, add under `C:\Users\<you>\.dsh\profiles\web\pnpm-workspace.yaml`:

```yaml
allowBuilds:
  dsh-telegram-channel: true
```

Then re-run the install command. **v0.2.1+** ships prebuilt `lib/` so this is usually unnecessary.

Fallback (most reliable):

```powershell
git clone https://github.com/hi-wenw/dsh-telegram-channel.git
dsh plugin --profile web add <absolute-path-to-clone>
```

3. Set token: `$env:DSH_TELEGRAM_TOKEN = "..."`.
4. Patch `allowedUserIds` in `~\.dsh\profiles\web\cordis.patch.yml` (see example above).
5. Restart `dsh web`, open a Web conversation, then on phone: `/sessions` → bind → chat.

### License

MIT
