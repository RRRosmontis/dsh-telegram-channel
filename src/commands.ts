export const MSG = {
  DENIED: '无权限。',
  WELCOME: [
    '你好，这是 DeepSeek Harness 的手机遥控器。',
    '本机会话是真相源：请先在 Web 打开对话，再用 /sessions 选择并附着。',
    '发送 /help 查看命令。',
  ].join('\n'),
  HELP: [
    '/sessions — 列出本机正在运行的会话并选择附着',
    '/status — 查看当前绑定',
    '/unbind — 断开绑定（不关闭本机会话）',
    '/help — 显示帮助',
    '',
    '绑定后直接发文字，消息会进入该本机会话；Web 与手机看到同一条轨迹。',
    '仅白名单用户可用。无 live 会话时请先在 dsh web 开对话。',
  ].join('\n'),
  NEED_BIND: '尚未绑定本机会话。请先发送 /sessions 选择一个。',
  NO_LIVE: '当前没有正在运行的本机会话。请先在 Web（dsh web）打开或继续一个对话，再发 /sessions。',
  BOUND(label: string): string {
    return `已附着本机会话：${label}\n此后消息将进入该会话（与 Web 同轨迹）。`
  },
  UNBOUND: '已断开绑定。本机会话仍在运行。',
  STATUS_NONE: '当前未绑定任何本机会话。发送 /sessions 选择。',
  STATUS_BOUND(label: string): string {
    return `当前绑定：${label}`
  },
  GONE: '绑定的会话已不在本机运行（可能已在 Web 关闭）。请重新 /sessions。',
  unknown(command: string): string {
    return `未知命令 ${command}。发送 /help 查看可用命令。`
  },
} as const

export type ParsedCommand =
  | { type: 'start'; text: string }
  | { type: 'help'; text: string }
  | { type: 'sessions'; text: string }
  | { type: 'status'; text: string }
  | { type: 'unbind'; text: string }
  | { type: 'unknown'; command: string; text: string }
  | { type: 'plain'; text: string }

export function parseCommand(text: string): ParsedCommand {
  if (!text.startsWith('/')) return { type: 'plain', text }
  const raw = text.split(/\s+/)[0] ?? text
  const command = raw.includes('@') ? raw.slice(0, raw.indexOf('@')) : raw
  switch (command) {
    case '/start':
      return { type: 'start', text }
    case '/help':
      return { type: 'help', text }
    case '/sessions':
    case '/list':
      return { type: 'sessions', text }
    case '/status':
      return { type: 'status', text }
    case '/unbind':
    case '/disconnect':
      return { type: 'unbind', text }
    default:
      return { type: 'unknown', command, text }
  }
}

/** Callback data prefix for session bind buttons. */
export const BIND_CB_PREFIX = 'bind:'
