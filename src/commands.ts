export const MSG = {
  DENIED: '无权限。',
  WELCOME:
    '你好，我是 DeepSeek Harness 渠道机器人。直接发消息开始对话，或发送 /help 查看命令。',
  HELP: [
    '/start — 开始 / 欢迎',
    '/new 或 /clear — 新开会话',
    '/help — 显示帮助',
    '',
    '仅白名单用户可对话；会话在内存中，重启 Harness 后需重新发消息建立。',
  ].join('\n'),
  NEW_SESSION: '已开启新会话。',
  unknown(command: string): string {
    return `未知命令 ${command}。发送 /help 查看可用命令。`
  },
} as const

export type ParsedCommand =
  | { type: 'start'; text: string }
  | { type: 'help'; text: string }
  | { type: 'new'; text: string }
  | { type: 'unknown'; command: string; text: string }
  | { type: 'plain'; text: string }

export function parseCommand(text: string): ParsedCommand {
  if (!text.startsWith('/')) return { type: 'plain', text }
  const command = text.split(/\s+/)[0] ?? text
  switch (command) {
    case '/start':
      return { type: 'start', text }
    case '/help':
      return { type: 'help', text }
    case '/new':
    case '/clear':
      return { type: 'new', text }
    default:
      return { type: 'unknown', command, text }
  }
}
