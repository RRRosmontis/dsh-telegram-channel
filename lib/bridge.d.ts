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
    rendering?: 'rich' | 'html';
}
export declare class TelegramBridge {
    private readonly ctx;
    private readonly token;
    private readonly allowedUserIds;
    private readonly allowAllUsers;
    private readonly client;
    private readonly sleep;
    private readonly maxMessageLength;
    private renderingMode;
    private readonly bindings;
    private readonly pickers;
    /** chatId → model awaiting reasoning-effort pick (kept outside picker so list refreshes won't drop it). */
    private readonly pendingModels;
    private polling;
    private offset;
    private pollPromise;
    private pollAbort;
    private disposeSessionListener;
    /** sessionIds mid-turn (busy feedback, /stop state) */
    private readonly busySessions;
    /** chatId → typing heartbeat interval handle */
    private readonly heartbeats;
    /** chatId → serialized notice chain (prevents 429 storms) */
    private readonly noticeQueue;
    private readonly pendingAsks;
    private hookTimer;
    private readonly pendingApprovalsTG;
    private disposeApprovalHook;
    /** sessionId → thinking indicator state (one notice per reasoning phase) */
    private readonly thinkingSessions;
    /** callId → tool name (tool/result failure notices) */
    private readonly callNames;
    /** sessionId → latest todo snapshot (/mission) */
    private readonly lastTodos;
    constructor(ctx: Context, options: TelegramBridgeOptions);
    start(): void;
    stop(): Promise<void>;
    processUpdate(update: TelegramUpdate): Promise<void>;
    private handleCallback;
    private resolveCatalog;
    private sendWorkspacePicker;
    private sendSessionPicker;
    private bindSession;
    private sendLastTurn;
    private sendModelPicker;
    private sendEffortPicker;
    private applyModel;
    private liveAgents;
    private findLiveAgent;
    /** Resume cold sessions when needed; never dispose the returned handle. */
    private ensureLiveAgent;
    private sendStatus;
    private followupBound;
    private pollLoop;
    private interruptibleDelay;
    private interruptibleSleep;
    private onSessionEvent;
    private deliver;
    private deliverHtml;
    /** Retry an outbound call with capped linear backoff (500ms, 1s, 2s… max 4s). */
    private withRetry;
    private escHtml;
    /**
     * Send a notice; a leading `> ` renders as a Telegram blockquote (HTML).
     * Falls back to plain text when the HTML send fails — a notice is never lost.
     */
    private deliverNotice;
    /** Serialized per-chat notice chain — bursts can't race into Telegram 429s. */
    private enqueueNotice;
    private startTypingHeartbeat;
    private stopTypingHeartbeat;
    private stopAllHeartbeats;
    private userQuestions;
    /**
     * Wrap the UI provider's ask() so Telegram gets a parallel answer path.
     * `Promise.race` decides; the UI path is untouched. The TG promise NEVER
     * settles when there is no bound chat — race would kill the UI's window
     * with that early rejection.
     */
    private hookUserQuestions;
    private registerTgAsk;
    private settleGuiSide;
    private formatAskPending;
    private handleTgAnswer;
    private onApprovalRequest;
    private handleTgApproval;
    private stopBound;
    private sendMission;
    /** /new: create a session in the bound session's workspace and attach to it. */
    private newSessionHere;
    private bindingsPath;
    private saveBindings;
    private loadBindings;
    private redact;
}
