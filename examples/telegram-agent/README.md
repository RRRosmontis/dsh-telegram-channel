# Telegram Agent 示例

最小可跑组合：在已有 DSH `web` profile 上挂载 `dsh-telegram-channel`，用环境变量提供 bot token，用白名单限制可对话用户。

## 适用场景

- 已能本地运行 `dsh web`，但尚未配置过 Telegram 渠道
- 希望抄一份 patch 片段，而不是手写 Cordis 插件注册

## 步骤

### 1. 安装插件

**本地开发目录**（将路径换成你的克隆位置）：

```powershell
dsh plugin --profile web add D:\gitData\dsh-telegram-channel
```

**GitHub**（发布后）：

```powershell
dsh plugin --profile web add github:<owner>/dsh-telegram-channel
```

`dsh plugin add` 会自动合并包内 `cordis.patch.yml`。若你更习惯手动编辑 profile patch，可将本目录下的 [`cordis.patch.example.yml`](cordis.patch.example.yml) 内容合并进 profile 的 patch 文件。

### 2. 配置白名单

编辑 profile 中 `dsh-telegram-channel` 的 `config`（或通过 patch）：

- 将 `allowedUserIds` 中的 `123456789` 换成你的 Telegram numeric user id（可用 [@userinfobot](https://t.me/userinfobot) 查询）
- **保持 `token: ''`**，token 走环境变量，避免写入版本库

示例见 [`cordis.patch.example.yml`](cordis.patch.example.yml)。

### 3. 设置环境变量

PowerShell：

```powershell
$env:DSH_TELEGRAM_TOKEN = '1234567890:AA...your-bot-token...'
```

也可写入系统 / 用户环境变量，或 profile 启动脚本。

### 4. 启动 profile

```powershell
dsh web
# 或你平时使用的 profile 启动命令；修改配置后需重载
```

### 5. Telegram 验收

| 步骤 | 预期 |
|---|---|
| 向 bot 发送 `/start` | 收到中文欢迎与用法 |
| 发送 `/help` | 收到命令列表 |
| 发送一条任务消息（如「你好」） | 收到 agent 回复 |
| 发送 `/new` | 收到「已开启新会话。」 |
| 再发消息 | 新会话上下文，仍可正常回复 |

未在白名单内的账号应收到「无权限。」

## 配置说明

| 字段 | 示例值 | 说明 |
|---|---|---|
| `token` | `''` | 留空，使用 `DSH_TELEGRAM_TOKEN` |
| `allowedUserIds` | `[123456789]` | 必填（生产环境）；空列表 = 拒绝所有人 |
| `provider` | `deepseek-official` | 与 profile 内 LLM 配置一致 |
| `model` | `deepseek-v4-flash` | 可按需更换 |

可选：`maxMessageLength`、`pollingTimeoutSec`、`cwd` 等见根目录 [README.md](../../README.md)。

## 常见问题

- **无响应且日志有 `missing bot token`**：检查 `DSH_TELEGRAM_TOKEN` 是否在 profile 启动前已设置。
- **「无权限。」**：核对 `allowedUserIds` 是否包含你的 user id（数字，非 @用户名）。
- **有 typing 无回复**：检查 DSH profile 的 API Key 与 agent 配置，而非本插件 token。

更多故障项见根目录 README 的「故障排查」一节。
