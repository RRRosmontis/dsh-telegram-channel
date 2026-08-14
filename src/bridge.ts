import type { Context } from '@deepseek-ai/cordis'
import type { AgentHandle } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm/message'
import type { ContentBlock, TextBlock } from '@deepseek-ai/dsh-llm/types'
import { SessionId, type SessionEvent } from '@deepseek-ai/dsh-session/types'
import { isAuthorized } from './auth.ts'
import { TelegramClient, type TelegramClientLike, type TelegramUpdate } from './client.ts'
import { MSG, parseCommand } from './commands.ts'
import { markdownToHtml, splitMessage } from './format.ts'

export interface TelegramBridgeOptions {
  token: string
  allowedUserIds: number[]
  allowAllUsers: boolean
  client?: TelegramClientLike
  sleep?: (ms: number) => Promise<void>
  provider?: string
  model?: string
  maxMessageLength?: number
  cwd?: string
}

interface ChatState {
  chatId: number
  handle: AgentHandle
  sessionId: ReturnType<typeof SessionId>
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
  private readonly provider: string
  private readonly model: string
  private readonly maxMessageLength: number
  private readonly cwd: string

  private readonly chats = new Map<string, ChatState>()
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
    this.client = options.client ?? new TelegramClient(options.token)
    this.sleep = options.sleep ?? defaultSleep
    this.provider = options.provider ?? 'deepseek-official'
    this.model = options.model ?? 'deepseek-v4-flash'
    this.maxMessageLength = options.maxMessageLength ?? 4096
    this.cwd = options.cwd ?? process.cwd()
  }

  start(): void {
    this.disposeSessionListener?.()
    this.disposeSessionListener = this.ctx.on('session/event', (session, event) => {
      void this.onSessionEvent(session, event)
    })
    if (!this.polling) {
      this.polling = true
      this.pollAbort = new AbortController()
      this.pollPromise = this.pollLoop()
    }
  }

  async stop(): Promise<void> {
    this.polling = false
    this.pollAbort?.abort()
    this.pollAbort = undefined
    this.disposeSessionListener?.()
    this.disposeSessionListener = undefined
    const disposals = [...this.chats.values()].map((chat) => chat.handle.dispose())
    this.chats.clear()
    await Promise.all(disposals)
    if (this.pollPromise) {
      await this.pollPromise.catch(() => {})
      this.pollPromise = undefined
    }
  }

  async processUpdate(update: TelegramUpdate): Promise<void> {
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
      case 'new':
        await this.resetChat(chatId)
        await this.client.sendMessage(chatId, MSG.NEW_SESSION)
        return
      case 'unknown':
        await this.client.sendMessage(chatId, MSG.unknown(parsed.command))
        return
      case 'plain':
        await this.ensureChat(chatId)
        await this.followup(chatId, parsed.text)
        return
    }
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
    const chat = this.findChatBySessionId(session.id)
    if (!chat) return

    if (event.type === 'turn/start') {
      await this.client.sendChatAction(chat.chatId, 'typing')
      return
    }

    if (event.type === 'assistant/message') {
      const text = contentToText(event.data.message.content)
      if (text) {
        await this.deliver(chat.chatId, text)
      }
    }
  }

  private findChatBySessionId(sessionId: ReturnType<typeof SessionId>): ChatState | undefined {
    for (const chat of this.chats.values()) {
      if (chat.sessionId === sessionId) return chat
    }
    return undefined
  }

  private async ensureChat(chatId: number): Promise<ChatState> {
    const key = String(chatId)
    const existing = this.chats.get(key)
    if (existing) return existing

    const sessionId = SessionId(`telegram:${chatId}`)
    const handle = await this.createAgent(sessionId)
    const state: ChatState = { chatId, handle, sessionId }
    this.chats.set(key, state)
    return state
  }

  private async resetChat(chatId: number): Promise<void> {
    const key = String(chatId)
    const existing = this.chats.get(key)
    if (existing) {
      await existing.handle.dispose()
      this.chats.delete(key)
    }
    const sessionId = SessionId(`telegram:${chatId}:${Date.now()}`)
    const handle = await this.createAgent(sessionId)
    this.chats.set(key, { chatId, handle, sessionId })
  }

  private async createAgent(sessionId: ReturnType<typeof SessionId>): Promise<AgentHandle> {
    return this.ctx.agents.create({
      sessionId,
      meta: { cwd: this.cwd },
      agentOptions: {
        provider: this.provider,
        model: this.model,
      },
    })
  }

  private async followup(chatId: number, text: string): Promise<void> {
    const chat = await this.ensureChat(chatId)
    const message = createUserMessage({
      content: [{ type: 'text', text }],
      source: { kind: 'user' },
    })
    chat.handle.agent.followup(message)
  }

  private async deliver(chatId: number, markdown: string): Promise<void> {
    const chunks = splitMessage(markdown, this.maxMessageLength)
    for (const chunk of chunks) {
      const html = markdownToHtml(chunk)
      try {
        await this.client.sendMessage(chatId, html, 'HTML')
      } catch {
        await this.client.sendMessage(chatId, chunk)
      }
    }
  }

  private redact(value: unknown): string {
    const message = value instanceof Error ? value.message : String(value)
    return message.split(this.token).join('***')
  }
}
