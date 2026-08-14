export declare const MSG: {
    readonly DENIED: "无权限。";
    readonly WELCOME: string;
    readonly HELP: string;
    readonly NEED_BIND: "尚未绑定本机会话。请先发送 /sessions 选择一个。";
    readonly NO_LIVE: "当前没有正在运行的本机会话。请先在 Web（dsh web）打开或继续一个对话，再发 /sessions。";
    readonly BOUND: (label: string) => string;
    readonly UNBOUND: "已断开绑定。本机会话仍在运行。";
    readonly STATUS_NONE: "当前未绑定任何本机会话。发送 /sessions 选择。";
    readonly STATUS_BOUND: (label: string) => string;
    readonly GONE: "绑定的会话已不在本机运行（可能已在 Web 关闭）。请重新 /sessions。";
    readonly unknown: (command: string) => string;
};
export type ParsedCommand = {
    type: 'start';
    text: string;
} | {
    type: 'help';
    text: string;
} | {
    type: 'sessions';
    text: string;
} | {
    type: 'status';
    text: string;
} | {
    type: 'unbind';
    text: string;
} | {
    type: 'unknown';
    command: string;
    text: string;
} | {
    type: 'plain';
    text: string;
};
export declare function parseCommand(text: string): ParsedCommand;
/** Callback data prefix for session bind buttons. */
export declare const BIND_CB_PREFIX = "bind:";
