import assert from 'node:assert/strict'
import test from 'node:test'
import type { UserMessage } from '@deepseek-ai/dsh-llm/types'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import { TelegramBridge } from '../src/bridge.ts'
import type { InlineKeyboardMarkup, TelegramClientLike, TelegramUpdate } from '../src/client.ts'
import { BIND_CB_PREFIX, MSG } from '../src/commands.ts'

type SentMessage = {
  chatId: number
  text: string
  parseMode?: string
  replyMarkup?: InlineKeyboardMarkup
}

function fakeClient(
  sent: SentMessage[],
  overrides: Partial<TelegramClientLike> = {},
): TelegramClientLike {
  return {
    getMe: async () => ({ id: 1 }),
    getUpdates: async () => [],
    sendMessage: async (chatId, text, parseMode, replyMarkup) => {
      sent.push({ chatId, text, parseMode, replyMarkup })
      return { message_id: 1, date: 0, chat: { id: chatId, type: 'private' }, text }
    },
    sendChatAction: async () => true,
    answerCallbackQuery: async () => true,
    setMyCommands: async () => true,
    ...overrides,
  }
}

function messageUpdate(chatId: number, userId: number, text: string, updateId = 1): TelegramUpdate {
  return {
    update_id: updateId,
    message: {
      message_id: updateId,
      date: 0,
      chat: { id: chatId, type: 'private' },
      from: { id: userId },
      text,
    },
  }
}

function makeAgent(id: string, followups: UserMessage[], opts?: {
  cwd?: string
  title?: string
}) {
  const cwd = opts?.cwd ?? `/proj/${id}`
  const events = opts?.title
    ? [{ type: 'session/title', data: { title: opts.title } }]
    : []
  return {
    id: SessionId(id),
    session: {
      header: { cwd },
      meta: { cwd },
      events,
    },
    followup(message: UserMessage) {
      followups.push(message)
    },
  }
}

test('unauthorized user gets denied', async () => {
  const sent: SentMessage[] = []
  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    agents: { list: () => [], roots: () => [], get: () => undefined },
    on() { return () => {} },
  }
  const bridge = new TelegramBridge(ctx as any, {
    token: 't',
    allowedUserIds: [1],
    allowAllUsers: false,
    client: fakeClient(sent),
    sleep: async () => {},
  })
  await bridge.processUpdate(messageUpdate(99, 99, 'hi'))
  assert.equal(sent[0]?.text, MSG.DENIED)
})

test('plain text without bind prompts NEED_BIND and does not create', async () => {
  const sent: SentMessage[] = []
  let createCalled = false
  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    agents: {
      list: () => [],
      roots: () => [],
      get: () => undefined,
      create: async () => { createCalled = true },
    },
    on() { return () => {} },
  }
  const bridge = new TelegramBridge(ctx as any, {
    token: 't',
    allowedUserIds: [1],
    allowAllUsers: false,
    client: fakeClient(sent),
    sleep: async () => {},
  })
  await bridge.processUpdate(messageUpdate(10, 1, 'do something'))
  assert.equal(createCalled, false)
  assert.equal(sent[0]?.text, MSG.NEED_BIND)
})

test('/sessions with no live agents shows NO_LIVE', async () => {
  const sent: SentMessage[] = []
  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    agents: { list: () => [], roots: () => [], get: () => undefined },
    on() { return () => {} },
  }
  const bridge = new TelegramBridge(ctx as any, {
    token: 't',
    allowedUserIds: [1],
    allowAllUsers: false,
    client: fakeClient(sent),
    sleep: async () => {},
  })
  await bridge.processUpdate(messageUpdate(10, 1, '/sessions'))
  assert.equal(sent[0]?.text, MSG.NO_LIVE)
})

test('/sessions lists live agents with bind callbacks', async () => {
  const sent: SentMessage[] = []
  const followups: UserMessage[] = []
  const agent = makeAgent('live-aaa', followups, {
    cwd: 'D:/gitData/demo-app',
    title: '演示会话',
  })
  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    agents: {
      list: () => [agent],
      roots: () => [agent],
      get: (id: ReturnType<typeof SessionId>) => (String(id) === 'live-aaa' ? agent : undefined),
    },
    on() { return () => {} },
  }
  const bridge = new TelegramBridge(ctx as any, {
    token: 't',
    allowedUserIds: [1],
    allowAllUsers: false,
    client: fakeClient(sent),
    sleep: async () => {},
  })
  await bridge.processUpdate(messageUpdate(10, 1, '/sessions'))
  assert.match(sent[0]!.text, /选择要遥控/)
  assert.match(sent[0]!.text, /演示会话/)
  assert.match(sent[0]!.text, /D:\/gitData\/demo-app/)
  assert.match(sent[0]!.replyMarkup!.inline_keyboard![0]![0]!.text, /演示会话/)
  assert.ok(sent[0]!.replyMarkup?.inline_keyboard?.[0]?.[0]?.callback_data?.startsWith(BIND_CB_PREFIX))
})

test('callback bind then plain text followups live agent; mirror assistant to chat', async () => {
  const sent: SentMessage[] = []
  const followups: UserMessage[] = []
  const agent = makeAgent('live-bbb', followups)
  let sessionListener: ((session: { id: ReturnType<typeof SessionId> }, event: unknown) => void) | undefined
  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    agents: {
      list: () => [agent],
      roots: () => [agent],
      get: (id: ReturnType<typeof SessionId>) => (String(id) === 'live-bbb' ? agent : undefined),
    },
    on(event: string, listener: (session: { id: ReturnType<typeof SessionId> }, event: unknown) => void) {
      if (event === 'session/event') sessionListener = listener
      return () => {}
    },
  }
  const bridge = new TelegramBridge(ctx as any, {
    token: 't',
    allowedUserIds: [1],
    allowAllUsers: false,
    client: fakeClient(sent),
    sleep: async () => {},
  })
  bridge.start()

  await bridge.processUpdate({
    update_id: 2,
    callback_query: {
      id: 'cq1',
      from: { id: 1 },
      message: {
        message_id: 1,
        date: 0,
        chat: { id: 10, type: 'private' },
        text: 'picker',
      },
      data: `${BIND_CB_PREFIX}live-bbb`,
    },
  })
  assert.match(sent.at(-1)!.text, /已附着/)

  await bridge.processUpdate(messageUpdate(10, 1, 'hello from phone', 3))
  assert.equal(followups.length, 1)
  assert.equal(followups[0]!.content[0]!.type, 'text')

  await sessionListener?.(
    { id: SessionId('live-bbb') },
    {
      type: 'assistant/message',
      data: { message: { content: [{ type: 'text', text: 'reply from agent' }] } },
    },
  )
  assert.ok(sent.some((m) => m.text.includes('reply from agent') || m.text.includes('reply')))

  await bridge.stop()
})

test('/unbind clears binding without needing create/dispose', async () => {
  const sent: SentMessage[] = []
  const followups: UserMessage[] = []
  const agent = makeAgent('live-ccc', followups)
  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    agents: {
      list: () => [agent],
      roots: () => [agent],
      get: () => agent,
    },
    on() { return () => {} },
  }
  const bridge = new TelegramBridge(ctx as any, {
    token: 't',
    allowedUserIds: [1],
    allowAllUsers: false,
    client: fakeClient(sent),
    sleep: async () => {},
  })
  await bridge.processUpdate({
    update_id: 1,
    callback_query: {
      id: 'cq',
      from: { id: 1 },
      message: { message_id: 1, date: 0, chat: { id: 10, type: 'private' } },
      data: `${BIND_CB_PREFIX}live-ccc`,
    },
  })
  await bridge.processUpdate(messageUpdate(10, 1, '/unbind', 2))
  assert.equal(sent.at(-1)?.text, MSG.UNBOUND)
  await bridge.processUpdate(messageUpdate(10, 1, 'again', 3))
  assert.equal(sent.at(-1)?.text, MSG.NEED_BIND)
  assert.equal(followups.length, 0)
})
