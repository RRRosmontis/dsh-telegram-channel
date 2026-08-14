import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'

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

export function apply(_ctx: Context, _config: TelegramChannelConfig): void {
  // Task 6 fills this in
}
