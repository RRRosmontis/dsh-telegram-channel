export interface TelegramUser {
  id: number
  is_bot?: boolean
  first_name?: string
  username?: string
}

export interface TelegramChat {
  id: number
  type: string
  title?: string
  username?: string
}

export interface TelegramMessage {
  message_id: number
  date: number
  chat: TelegramChat
  from?: TelegramUser
  text?: string
}

export interface TelegramCallbackQuery {
  id: string
  from: TelegramUser
  message?: TelegramMessage
  data?: string
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

export interface InlineKeyboardButton {
  text: string
  callback_data: string
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][]
}

export interface TelegramClientOptions {
  fetch?: typeof fetch
  baseUrl?: string
  pollingTimeoutSec?: number
}

export interface TelegramClientLike {
  getMe(): Promise<TelegramUser>
  getUpdates(offset?: number): Promise<TelegramUpdate[]>
  sendMessage(
    chatId: number,
    text: string,
    parseMode?: string,
    replyMarkup?: InlineKeyboardMarkup,
  ): Promise<TelegramMessage>
  sendChatAction(chatId: number, action: string): Promise<boolean>
  answerCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean>
}

export class TelegramClient implements TelegramClientLike {
  private readonly token: string
  private readonly fetchImpl: typeof fetch
  private readonly baseUrl: string
  private readonly pollingTimeoutSec: number

  constructor(token: string, options: TelegramClientOptions = {}) {
    if (!token) {
      throw new Error('bot token is required')
    }
    this.token = token
    this.fetchImpl = options.fetch ?? fetch
    this.baseUrl = options.baseUrl ?? 'https://api.telegram.org'
    this.pollingTimeoutSec = options.pollingTimeoutSec ?? 30
  }

  private redact(message: string): string {
    return message.split(this.token).join('***')
  }

  private async call<T>(method: string, body?: Record<string, unknown>): Promise<T> {
    const url = `${this.baseUrl}/bot${this.token}/${method}`
    try {
      const init: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
      if (body !== undefined) {
        init.body = JSON.stringify(body)
      }
      const response = await this.fetchImpl(url, init)
      const json = (await response.json()) as { ok: boolean; result: T; description?: string }
      if (!json.ok) {
        throw new Error(json.description ?? 'Telegram API error')
      }
      return json.result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(this.redact(message))
    }
  }

  async getMe(): Promise<TelegramUser> {
    return this.call<TelegramUser>('getMe')
  }

  async getUpdates(offset?: number): Promise<TelegramUpdate[]> {
    const body: Record<string, unknown> = {
      timeout: this.pollingTimeoutSec,
      allowed_updates: ['message', 'callback_query'],
    }
    if (offset !== undefined) {
      body.offset = offset
    }
    return this.call<TelegramUpdate[]>('getUpdates', body)
  }

  async sendMessage(
    chatId: number,
    text: string,
    parseMode?: string,
    replyMarkup?: InlineKeyboardMarkup,
  ): Promise<TelegramMessage> {
    const body: Record<string, unknown> = { chat_id: chatId, text }
    if (parseMode !== undefined) {
      body.parse_mode = parseMode
    }
    if (replyMarkup !== undefined) {
      body.reply_markup = replyMarkup
    }
    return this.call<TelegramMessage>('sendMessage', body)
  }

  async sendChatAction(chatId: number, action: string): Promise<boolean> {
    return this.call<boolean>('sendChatAction', { chat_id: chatId, action })
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean> {
    const body: Record<string, unknown> = { callback_query_id: callbackQueryId }
    if (text !== undefined) body.text = text
    return this.call<boolean>('answerCallbackQuery', body)
  }
}
