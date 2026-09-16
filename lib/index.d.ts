import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
export declare const name = "dsh-telegram-channel";
/** agents: followup; apiProxy: workspace/session catalog + /model; userQuestions: TG answer hook (Cordis requires inject). */
export declare const inject: string[];
export interface TelegramChannelConfig {
    token?: string;
    allowedUserIds?: number[];
    allowAllUsers?: boolean;
    maxMessageLength?: number;
    pollingTimeoutSec?: number;
    /** 默认 'rich' = Telegram native Rich Messages（需较新客户端）；
     *  显式 'html'/'compat' 等其它值 = 兼容模式，所有客户端可显示。 */
    rendering?: string;
}
export declare const Config: Schema<TelegramChannelConfig>;
export declare function apply(ctx: Context, config: TelegramChannelConfig): void;
export * from './format.js';
export * from './client.js';
export * from './auth.js';
export * from './commands.js';
export * from './label.js';
export * from './bridge.js';
