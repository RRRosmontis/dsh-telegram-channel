# dsh-telegram-channel

[English](#english) · 中文

DeepSeek Harness（DSH）的 **Telegram 渠道 Cordis 插件**：长轮询接入 Bot API，按聊天创建独立 agent，将助手回复以 HTML 分片回传。开箱路径是 `dsh plugin add`，目标约 10 分钟内完成安装到首条 agent 回复。

## 特性

- 标准 Cordis 插件（`inject: ['agents']`），通过 `cordis.patch.yml` 挂入 profile
- 长轮询 `getUpdates`，无需公网 webhook
- 按 chat 内存会话映射；`/new` 可重置对话
- 白名单鉴权（fail-closed）；鉴权与命令文案默认中文
- Markdown 子集 → Telegram HTML，超长自动分片；HTML 被拒时降级纯文本
- 无 token 时软失败：打日志、不启轮询，不拖垮整个 profile

## 前置条件

| 项 | 要求 |
|---|---|
| Node.js | ≥ 22 |
| DeepSeek Harness | 已能运行目标 profile（如 `dsh web`），并完成官方要求的 API Key 等配置 |
| Telegram | 通过 [@BotFather](https://t.me/BotFather) 创建 bot 并取得 token |
| 用户 ID | 通过 [@userinfobot](https://t.me/userinfobot) 等获取自己的 Telegram numeric user id |

## 快速开始（≤10 分钟）

1. 确认本机 `dsh web`（或你的目标 profile）可正常启动。
2. 取得 bot token 与自己的 user id。
3. 安装本插件（见下方「安装」）。
4. 设置 `DSH_TELEGRAM_TOKEN`，并在插件配置中填写 `allowedUserIds`（推荐 env 存 token，避免误提交）。
5. 重新加载或启动 profile。
6. 在 Telegram 向 bot 发送 `/start`，再发一条普通消息，应收到 agent 回复；发送 `/new` 应提示已开启新会话。

## 安装

### 从 GitHub（发布后）

```powershell
dsh plugin --profile web add github:<owner>/dsh-telegram-channel
```

将 `<owner>` 替换为实际 GitHub 用户名或组织名。

### 从本地目录（开发 / 未发布）

```powershell
dsh plugin --profile web add D:\path\to\dsh-telegram-channel
```

`dsh plugin add` 会读取包内 `cordis.patch.yml` 并合并进 profile。也可参考 [`examples/telegram-agent/`](examples/telegram-agent/) 中的示例 patch。

## 环境变量与配置

**推荐**：token 走环境变量，白名单写在 patch / 插件配置中。

| 键 | 默认 | 含义 |
|---|---|---|
| `token` | `''`（空则读 `DSH_TELEGRAM_TOKEN`） | BotFather 下发的 bot token |
| `allowedUserIds` | `[]` | 允许对话的 Telegram user id；**空列表且 `allowAllUsers: false` 时拒绝所有人** |
| `allowAllUsers` | `false` | 为 `true` 时忽略白名单（仅调试；生产环境勿开） |
| `provider` | `deepseek-official` | 创建 agent 时的 LLM provider |
| `model` | `deepseek-v4-flash` | 创建 agent 时的模型 id |
| `maxMessageLength` | `4096` | 单条 Telegram 消息长度上限 |
| `pollingTimeoutSec` | `30` | `getUpdates` 长轮询超时（秒） |
| `cwd` | 未设置时用进程 `cwd` | 传给 agent 的工作目录 |

示例 patch 片段：

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

设置 token（PowerShell）：

```powershell
$env:DSH_TELEGRAM_TOKEN = '123456:ABC...'
```

修改配置后需**重新加载或重启** profile 才会生效。

## 命令

| 命令 | 行为 |
|---|---|
| `/start` | 欢迎与简短用法；不调用模型 |
| `/help` | 命令列表与白名单 / 会话说明 |
| `/new` 或 `/clear` | 释放该 chat 的 agent，下次普通消息重建会话 |
| 未识别的 `/...` | 提示可用命令 |
| 普通文本 | `create` / `followup` → 回传助手文本 |

## 故障排查

| 现象 | 可能原因 | 处理 |
|---|---|---|
| 日志出现 `missing bot token`；bot 无响应 | 未设置 `config.token` 且未设置 `DSH_TELEGRAM_TOKEN` | 设置 env 或 patch 中的 token，然后重载 profile |
| 收到「无权限。」 | user id 不在 `allowedUserIds`，或白名单为空 | 用 @userinfobot 核对 id，写入 `allowedUserIds` |
| Telegram 401 / token 无效 | token 错误或已撤销 | 在 BotFather 重新生成 token 并更新 env |
| 有 typing 但无文字回复 | profile 内 LLM / agent 配置或 API Key 问题 | 查看 DSH 日志；先在同一 profile 用 CLI 验证 agent |
| 重启 Harness 后对话「失忆」 | MVP 会话仅内存，设计如此 | 直接发消息或 `/new` 重建；跨重启持久化见 Phase 2 |
| `npm install` 报 peer 冲突 | 上游 DSH RC 包 `dsh-invariants` 版本未对齐 | 贡献者使用 `npm install --legacy-peer-deps`（见下文） |

## Phase 2 路线图（不进 MVP）

1. 运维键盘：新对话 / 状态 / 停止 / 更多
2. 进度体验：同消息编辑流式、阶段摘要
3. 会话持久化：chat↔session 跨重启
4. cwd / 项目切换：对接 harness workspace 策略
5. Telegram 侧切换 provider / model
6. 媒体：图片接入视觉类工具（若 profile 具备）
7. 可选 webhook（需公网 HTTPS）

## 安全说明

- **Fail-closed 白名单**：`allowedUserIds` 为空且 `allowAllUsers: false` 时，所有人被拒绝。
- **Token 优先走环境变量**，避免写入版本库；日志中对 token 做脱敏。
- **`allowAllUsers: true` 仅用于本地调试**，不要在生产 profile 开启。
- 本插件不自行启动 LLM；模型、工具与沙箱由所在 DSH profile 决定。

## 贡献者：开发与测试

```powershell
git clone <repo-url> D:\gitData\dsh-telegram-channel
cd D:\gitData\dsh-telegram-channel
npm install --legacy-peer-deps
npm test
npm run build
```

> **说明**：当前 DSH RC 系列包的 `@deepseek-ai/dsh-invariants` peer 版本尚未完全对齐，直接 `npm install` 可能 `ERESOLVE`。使用 `--legacy-peer-deps` 可正常安装 devDependencies 并完成构建与单测；运行时由宿主 profile 提供 peer 包。

### 手工冒烟（需真实 bot）

在单元测试与构建通过后，可用以下步骤验收（本仓库发布前未在此环境执行 live Telegram 冒烟）：

1. `npm run build`
2. `dsh plugin --profile web add <本仓库路径>`
3. 设置 `DSH_TELEGRAM_TOKEN` 与 `allowedUserIds`
4. 启动 / 重载 profile
5. Telegram：`/start` → 发消息 → 收到回复；`/new` 仍可用

## Last verified（最后验证）

| 项 | 值 |
|---|---|
| 包版本 | `0.1.0` |
| 验证日期 | 2026-08-14 |
| 验证方式 | `npm test`（25/25 通过）+ `npm run build` |
| DSH peer（package.json） | `@deepseek-ai/cordis` ^4.0.1 · `@deepseek-ai/dsh-agent` ^0.1.0-rc.6 · `@deepseek-ai/dsh-llm` ^0.0.1-rc.1 · `@deepseek-ai/dsh-session` ^0.0.1-rc.1 |
| Live Telegram 冒烟 | 未执行（见上方操作清单） |

## 许可证

[MIT](LICENSE)

---

## English

**dsh-telegram-channel** is a Cordis plugin for [DeepSeek Harness](https://github.com/deepseek-ai) that bridges Telegram (long polling) to `ctx.agents`: per-chat sessions, Chinese auth/command copy, HTML message splitting.

Install:

```powershell
dsh plugin --profile web add github:<owner>/dsh-telegram-channel
# or local: dsh plugin --profile web add D:\path\to\dsh-telegram-channel
```

Set `DSH_TELEGRAM_TOKEN` and `allowedUserIds` in plugin config. Empty allowlist rejects everyone (fail-closed). Missing token: logs error, does not start polling (soft-fail).

Contributors: `npm install --legacy-peer-deps` due to upstream DSH peer alignment.

**Last verified:** package `0.1.0`, 2026-08-14 — unit tests + build pass; live bot smoke not run in CI.

License: MIT.

### Optional: publish to GitHub

仅在需要公开发布时执行：

```powershell
gh repo create dsh-telegram-channel --public --source=D:\gitData\dsh-telegram-channel --remote=origin --push
gh repo edit --add-topic dsh-plugin
git tag v0.1.0
git push origin v0.1.0
```
