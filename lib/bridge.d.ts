import type { Context } from '@deepseek-ai/cordis';
import { type TelegramClientLike, type TelegramUpdate } from './client.js';
export interface TelegramBridgeOptions {
    token: string;
    allowedUserIds: number[];
    allowAllUsers: boolean;
    client?: TelegramClientLike;
    sleep?: (ms: number) => Promise<void>;
    maxMessageLength?: number;
    pollingTimeoutSec?: number;
}
export declare class TelegramBridge {
    private readonly ctx;
    private readonly token;
    private readonly allowedUserIds;
    private readonly allowAllUsers;
    private readonly client;
    private readonly sleep;
    private readonly maxMessageLength;
    private readonly bindings;
    private polling;
    private offset;
    private pollPromise;
    private pollAbort;
    private disposeSessionListener;
    constructor(ctx: Context, options: TelegramBridgeOptions);
    start(): void;
    stop(): Promise<void>;
    processUpdate(update: TelegramUpdate): Promise<void>;
    private handleCallback;
    private liveAgents;
    private findLiveAgent;
    private sendSessionPicker;
    private sendStatus;
    private followupBound;
    private pollLoop;
    private interruptibleDelay;
    private interruptibleSleep;
    private onSessionEvent;
    private deliver;
    private redact;
}
