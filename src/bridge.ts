import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm/message'
import type { ContentBlock, TextBlock } from '@deepseek-ai/dsh-llm/types'
import { SessionId, type SessionEvent } from '@deepseek-ai/dsh-session/types'
import { isAuthorized } from './auth.js'
import {
  TelegramClient,
  type InlineKeyboardMarkup,
  type TelegramClientLike,
  type TelegramUpdate,
} from './client.js'
import { BIND_CB_PREFIX, MSG, parseCommand } from './commands.js'
import { markdownToHtml, splitMessage } from './format.js'
import { buttonLabel, describeAgent, detailLines, displayLabel } from './label.js'

export interface TelegramBridgeOptions {
  token: string
  allowedUserIds: number[]
  allowAllUsers: boolean
  client?: TelegramClientLike
  sleep?: (ms: number) => Promise<void>
  maxMessageLength?: number
  pollingTimeoutSec?: number
}

/** chatId → bound live session id (string form of SessionId) */
interface Binding {
  chatId: number
  sessionId: string
  label: string
}

interface SessionLike {
  id: ReturnType<typeof SessionId>
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function contentToText(content: readonly ContentBlock[]): string {
  return content
    .filter((block): block is TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

export class TelegramBridge {
  private readonly ctx: Context
  private readonly token: string
  private readonly allowedUserIds: number[]
  private readonly allowAllUsers: boolean
  private readonly client: TelegramClientLike
  private readonly sleep: (ms: number) => Promise<void>
  private readonly maxMessageLength: number

  private readonly bindings = new Map<string, Binding>()
  private polling = false
  private offset: number | undefined
  private pollPromise: Promise<void> | undefined
  private pollAbort: AbortController | undefined
  private disposeSessionListener: (() => void) | undefined

  constructor(ctx: Context, options: TelegramBridgeOptions) {
    this.ctx = ctx
    this.token = options.token
    this.allowedUserIds = options.allowedUserIds
    this.allowAllUsers = options.allowAllUsers
    this.client = options.client ?? new TelegramClient(options.token, {
      pollingTimeoutSec: options.pollingTimeoutSec ?? 30,
    })
    this.sleep = options.sleep ?? defaultSleep
    this.maxMessageLength = options.maxMessageLength ?? 4096
  }

  start(): void {
    this.disposeSessionListener?.()
    this.disposeSessionListener = this.ctx.on('session/event', (session, event) => {
      void this.onSessionEvent(session, event).catch((err) => {
        this.ctx.logger.error(this.redact(err))
      })
    })
    void this.client.setMyCommands([
      { command: 'start', description: '欢迎与用法' },
      { command: 'sessions', description: '列出并附着本机 live 会话' },
      { command: 'status', description: '查看当前绑定' },
      { command: 'unbind', description: '断开手机绑定（不关闭本机会话）' },
      { command: 'help', description: '显示帮助' },
    ]).then(() => {
      this.ctx.logger.info('dsh-telegram-channel: bot commands registered')
    }).catch((err) => {
      this.ctx.logger.warn(`dsh-telegram-channel: setMyCommands failed: ${this.redact(err)}`)
    })
    if (!this.polling) {
      this.polling = true
      this.pollAbort = new AbortController()
      this.ctx.logger.info('dsh-telegram-channel: long-polling started')
      this.pollPromise = this.pollLoop()
    }
  }

  async stop(): Promise<void> {
    this.polling = false
    this.pollAbort?.abort()
    this.pollAbort = undefined
    this.disposeSessionListener?.()
    this.disposeSessionListener = undefined
    // Never dispose host agents — only clear remote bindings.
    this.bindings.clear()
    if (this.pollPromise) {
      await this.pollPromise.catch(() => {})
      this.pollPromise = undefined
    }
  }

  async processUpdate(update: TelegramUpdate): Promise<void> {
    if (update.callback_query) {
      await this.handleCallback(update)
      return
    }
    const message = update.message
    if (!message?.text) return

    const chatId = message.chat.id
    const userId = message.from?.id

    if (!isAuthorized({ allowAllUsers: this.allowAllUsers, allowedUserIds: this.allowedUserIds, userId })) {
      await this.client.sendMessage(chatId, MSG.DENIED)
      return
    }

    const parsed = parseCommand(message.text)
    switch (parsed.type) {
      case 'start':
        await this.client.sendMessage(chatId, MSG.WELCOME)
        return
      case 'help':
        await this.client.sendMessage(chatId, MSG.HELP)
        return
      case 'sessions':
        await this.sendSessionPicker(chatId)
        return
      case 'status':
        await this.sendStatus(chatId)
        return
      case 'unbind':
        this.bindings.delete(String(chatId))
        await this.client.sendMessage(chatId, MSG.UNBOUND)
        return
      case 'unknown':
        await this.client.sendMessage(chatId, MSG.unknown(parsed.command))
        return
      case 'plain':
        await this.followupBound(chatId, parsed.text)
        return
    }
  }

  private async handleCallback(update: TelegramUpdate): Promise<void> {
    const cq = update.callback_query!
    const userId = cq.from.id
    const chatId = cq.message?.chat.id
    if (chatId === undefined) {
      await this.client.answerCallbackQuery(cq.id)
      return
    }
    if (!isAuthorized({ allowAllUsers: this.allowAllUsers, allowedUserIds: this.allowedUserIds, userId })) {
      await this.client.answerCallbackQuery(cq.id, MSG.DENIED)
      await this.client.sendMessage(chatId, MSG.DENIED)
      return
    }
    const data = cq.data ?? ''
    if (!data.startsWith(BIND_CB_PREFIX)) {
      await this.client.answerCallbackQuery(cq.id)
      return
    }
    const sessionId = data.slice(BIND_CB_PREFIX.length)
    const agent = this.findLiveAgent(sessionId)
    if (!agent) {
      await this.client.answerCallbackQuery(cq.id, '会话不存在')
      await this.client.sendMessage(chatId, MSG.GONE)
      return
    }
    const label = displayLabel(describeAgent(agent, 0, this.ctx))
    this.bindings.set(String(chatId), { chatId, sessionId: String(agent.id), label })
    await this.client.answerCallbackQuery(cq.id, '已附着')
    await this.client.sendMessage(chatId, MSG.BOUND(label))
  }

  private liveAgents(): Agent[] {
    const agents = this.ctx.agents
    if (typeof agents.roots === 'function') {
      const roots = agents.roots()
      if (roots.length > 0) return roots
    }
    if (typeof agents.list === 'function') return agents.list()
    return []
  }

  private findLiveAgent(sessionId: string): Agent | undefined {
    const agents = this.ctx.agents
    if (typeof agents.get === 'function') {
      try {
        const found = agents.get(SessionId(sessionId))
        if (found) return found
      } catch {
        // fall through to list scan
      }
    }
    return this.liveAgents().find((a) => String(a.id) === sessionId)
  }

  private async sendSessionPicker(chatId: number): Promise<void> {
    const agents = this.liveAgents()
    if (agents.length === 0) {
      await this.client.sendMessage(chatId, MSG.NO_LIVE)
      return
    }
    const described = agents.map((agent, i) => describeAgent(agent, i, this.ctx))
    const keyboard: InlineKeyboardMarkup = {
      inline_keyboard: described.map((parts) => ([{
        text: buttonLabel(parts),
        callback_data: `${BIND_CB_PREFIX}${parts.sessionId}`,
      }])),
    }
    const body = [
      `选择要遥控的本机会话（共 ${agents.length} 个）：`,
      '',
      ...described.map((parts) => detailLines(parts)),
      '',
      '点下方按钮附着对应会话。',
    ].join('\n')
    await this.client.sendMessage(chatId, body, undefined, keyboard)
  }

  private async sendStatus(chatId: number): Promise<void> {
    const binding = this.bindings.get(String(chatId))
    if (!binding) {
      await this.client.sendMessage(chatId, MSG.STATUS_NONE)
      return
    }
    const stillLive = this.findLiveAgent(binding.sessionId)
    if (!stillLive) {
      this.bindings.delete(String(chatId))
      await this.client.sendMessage(chatId, MSG.GONE)
      return
    }
    await this.client.sendMessage(chatId, MSG.STATUS_BOUND(binding.label))
  }

  private async followupBound(chatId: number, text: string): Promise<void> {
    const binding = this.bindings.get(String(chatId))
    if (!binding) {
      await this.client.sendMessage(chatId, MSG.NEED_BIND)
      return
    }
    const agent = this.findLiveAgent(binding.sessionId)
    if (!agent) {
      this.bindings.delete(String(chatId))
      await this.client.sendMessage(chatId, MSG.GONE)
      return
    }
    const message = createUserMessage({
      content: [{ type: 'text', text }],
      source: { kind: 'user' },
    })
    agent.followup(message)
  }

  private async pollLoop(): Promise<void> {
    const signal = this.pollAbort?.signal
    let errorCount = 0
    while (this.polling) {
      try {
        const updates = await this.client.getUpdates(this.offset)
        if (!this.polling) break
        errorCount = 0
        if (updates.length === 0) {
          await this.interruptibleDelay(50, signal)
          continue
        }
        for (const update of updates) {
          if (!this.polling) break
          await this.processUpdate(update)
          this.offset = update.update_id + 1
        }
      } catch (err) {
        if (!this.polling) break
        errorCount += 1
        this.ctx.logger.error(this.redact(err))
        await this.interruptibleSleep(Math.min(1000 * errorCount, 10_000), signal)
      }
    }
  }

  private interruptibleDelay(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted || !this.polling) return Promise.resolve()
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms)
      signal?.addEventListener('abort', () => {
        clearTimeout(timer)
        resolve()
      }, { once: true })
    })
  }

  private async interruptibleSleep(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted || !this.polling) return
    await Promise.race([
      this.sleep(ms),
      new Promise<void>((resolve) => {
        if (signal?.aborted) {
          resolve()
          return
        }
        signal?.addEventListener('abort', () => resolve(), { once: true })
      }),
    ])
  }

  private async onSessionEvent(session: SessionLike, event: SessionEvent): Promise<void> {
    const id = String(session.id)
    const targets = [...this.bindings.values()].filter((b) => b.sessionId === id)
    if (targets.length === 0) return

    if (event.type === 'turn/start') {
      await Promise.all(targets.map((b) => this.client.sendChatAction(b.chatId, 'typing')))
      return
    }

    if (event.type === 'assistant/message') {
      const text = contentToText(event.data.message.content)
      if (!text) return
      await Promise.all(targets.map((b) => this.deliver(b.chatId, text)))
    }
  }

  private async deliver(chatId: number, markdown: string): Promise<void> {
    const chunks = splitMessage(markdown, this.maxMessageLength)
    for (const chunk of chunks) {
      const html = markdownToHtml(chunk)
      try {
        await this.client.sendMessage(chatId, html, 'HTML')
      } catch {
        try {
          await this.client.sendMessage(chatId, chunk)
        } catch (err) {
          this.ctx.logger.error(this.redact(err))
        }
      }
    }
  }

  private redact(value: unknown): string {
    const message = value instanceof Error ? value.message : String(value)
    return message.split(this.token).join('***')
  }
}
