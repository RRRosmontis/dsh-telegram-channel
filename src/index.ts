import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { TelegramBridge } from './bridge.js'

export const name = 'dsh-telegram-channel'
export const inject = ['agents']

export interface TelegramChannelConfig {
  token?: string
  allowedUserIds?: number[]
  allowAllUsers?: boolean
  provider?: string
  model?: string
  maxMessageLength?: number
  pollingTimeoutSec?: number
  cwd?: string
}

export const Config: Schema<TelegramChannelConfig> = Schema.object({
  token: Schema.string().default(''),
  allowedUserIds: Schema.array(Schema.number()).default([]),
  allowAllUsers: Schema.boolean().default(false),
  provider: Schema.string().default('deepseek-official'),
  model: Schema.string().default('deepseek-v4-flash'),
  maxMessageLength: Schema.number().default(4096),
  pollingTimeoutSec: Schema.number().default(30),
  cwd: Schema.string(),
})

export function apply(ctx: Context, config: TelegramChannelConfig): void {
  const token = (config.token && config.token.length > 0)
    ? config.token
    : (process.env.DSH_TELEGRAM_TOKEN ?? '')
  if (!token) {
    ctx.logger.error(
      'dsh-telegram-channel: missing bot token (set config.token or DSH_TELEGRAM_TOKEN); polling not started',
    )
    return
  }
  const bridge = new TelegramBridge(ctx, {
    token,
    allowedUserIds: config.allowedUserIds ?? [],
    allowAllUsers: config.allowAllUsers ?? false,
    provider: config.provider ?? 'deepseek-official',
    model: config.model ?? 'deepseek-v4-flash',
    maxMessageLength: config.maxMessageLength ?? 4096,
    pollingTimeoutSec: config.pollingTimeoutSec ?? 30,
    cwd: config.cwd ?? process.cwd(),
  })
  ctx.effect(() => {
    bridge.start()
    return () => { void bridge.stop() }
  }, 'dsh-telegram-channel.serve')
}

export * from './format.js'
export * from './client.js'
export * from './auth.js'
export * from './commands.js'
export * from './bridge.js'
