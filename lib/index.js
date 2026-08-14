import Schema from '@deepseek-ai/schemastery';
import { TelegramBridge } from './bridge.js';
export const name = 'dsh-telegram-channel';
export const inject = ['agents'];
export const Config = Schema.object({
    token: Schema.string().default(''),
    allowedUserIds: Schema.array(Schema.number()).default([]),
    allowAllUsers: Schema.boolean().default(false),
    maxMessageLength: Schema.number().default(4096),
    pollingTimeoutSec: Schema.number().default(30),
});
export function apply(ctx, config) {
    const token = (config.token && config.token.length > 0)
        ? config.token
        : (process.env.DSH_TELEGRAM_TOKEN ?? '');
    if (!token) {
        ctx.logger.error('dsh-telegram-channel: missing bot token (set config.token or DSH_TELEGRAM_TOKEN); polling not started');
        return;
    }
    const bridge = new TelegramBridge(ctx, {
        token,
        allowedUserIds: config.allowedUserIds ?? [],
        allowAllUsers: config.allowAllUsers ?? false,
        maxMessageLength: config.maxMessageLength ?? 4096,
        pollingTimeoutSec: config.pollingTimeoutSec ?? 30,
    });
    ctx.effect(() => {
        bridge.start();
        return () => { void bridge.stop(); };
    }, 'dsh-telegram-channel.serve');
}
export * from './format.js';
export * from './client.js';
export * from './auth.js';
export * from './commands.js';
export * from './bridge.js';
