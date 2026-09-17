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
    /** Global rendering mode: follows config; flipped to 'html' permanently when the
     *  Rich Message API itself is unavailable (a server-wide fact, not per-chat). */
    private renderingMode;
    /** Per-chat rendering override (persisted): rich messages need a recent Telegram
     *  client — old ones (e.g. 10.x) cannot render them and show “unsupported”. */
    private readonly renderPrefs;
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
    /** Prototype-ask interceptor state (see installAskInterceptor). */
    private askInstalled;
    private askRestore;
    /** Prototype-approval interceptor state (see installApprovalInterceptor). */
    private approvalInstalled;
    private approvalRestore;
    /** callId → tool name (tool/result failure notices) */
    private readonly callNames;
    /** sessionId → latest todo snapshot (/mission) */
    private readonly lastTodos;
    /** sessionId → in-flight manual compaction (dedup /compact) */
    private readonly compacting;
    /** sessionId → compaction abort controller (cancelled on bridge stop) */
    private readonly compactAborts;
    /** Album accumulation: chatId:media_group_id → parts buffered into one prompt. */
    private readonly mediaGroups;
    constructor(ctx: Context, options: TelegramBridgeOptions);
    /** Effective rendering mode for a chat: per-chat override, else the global mode. */
    private modeFor;
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
    /** 按 sessionId 解析工作区：apiProxy 目录优先，冷/热会话均可用；退化为 agent cwd。 */
    private workspaceOf;
    /** 从 sessionProjections 快照读 Web 底部同款统计（sessionStats/tokenUsage/contextPressure）。 */
    private readRuntimeValues;
    /** 按名称解析宿主服务（Cordis 需 ctx.get；mock/plain ctx 走自有属性兜底）。 */
    private serviceOf;
    private requestCompact;
    /**
     * TG /goal —— 走宿主命令运行时（commands.execute），与 Web 端 /goal 完全同一条
     * 通道：command-goal 在宿主侧操作 session-log 支撑的 goals 域，不依赖 GUI 连接。
     */
    private requestGoal;
    /** 等待压缩落定并汇报结果（不阻塞轮询循环）。 */
    private runCompaction;
    private followupBound;
    /**
     * Extract wire prompt parts from a media message.
     * Returns undefined when the message carries no media at all; returns [] for
     * an unsupported media type (the user was already notified); otherwise the
     * caption text part (when present) followed by the image part.
     */
    private collectMediaParts;
    /** Download one TG file and encode it as a canonical-base64 wire image part. */
    private downloadImagePart;
    /**
     * Album photos arrive as separate updates sharing a media_group_id — debounce
     * them into ONE prompt so an album does not spawn N sequential turns.
     */
    private accumulateMediaGroup;
    /**
     * Dispatch an image-bearing message to the bound session through the host
     * prompt RPC — the exact channel the Web composer uses. The host checks
     * whether the current model accepts image input, admits the bytes into the
     * durable attachment store, then queues the message on the agent (mode
     * 'queue' — same semantics as the text path's agent.followup).
     */
    private sendImageFollowup;
    private pollLoop;
    private interruptibleDelay;
    private interruptibleSleep;
    private onSessionEvent;
    private handleRichCommand;
    private deliver;
    private deliverHtml;
    /** Retry an outbound call with capped linear backoff (500ms, 1s, 2s… max 4s). */
    private withRetry;
    /**
     * Send a notice; a leading `> ` marks the body for quote rendering as a real
     * `<blockquote>` (parse_mode HTML) — every current Telegram client draws the
     * accent-colored left bar. Old-client compatibility is no longer required,
     * but a failed HTML send still falls back to plain text — a notice is never lost.
     */
    private deliverNotice;
    /** Serialized per-chat notice chain — bursts can't race into Telegram 429s. */
    private enqueueNotice;
    private startTypingHeartbeat;
    private stopTypingHeartbeat;
    private stopAllHeartbeats;
    private installAskInterceptor;
    private aroundUserQuestionAsk;
    private registerTgAsk;
    /** Announce the incoming question, then one message per question (options as native inline-keyboard buttons). */
    private deliverAskPrompt;
    /** Resolve the pending ask once EVERY question has an answer (keyboard and/or text). */
    private finalizeAskIfComplete;
    private settleGuiSide;
    private handleTgAnswer;
    /** Inline-keyboard tap on an ask message: toggle/record the choice, resolve when every question is answered. */
    private handleAskCallback;
    private installApprovalInterceptor;
    private aroundApprovalRequest;
    /** Approval prompt as native inline-keyboard buttons; falls back to a plain-text prompt. */
    private deliverApprovalPrompt;
    private handleApprovalCallback;
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
