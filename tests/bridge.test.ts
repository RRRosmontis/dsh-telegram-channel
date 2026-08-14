import assert from 'node:assert/strict'
import test from 'node:test'
import type { CreateAgentOptions } from '@deepseek-ai/dsh-agent'
import type { UserMessage } from '@deepseek-ai/dsh-llm/types'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import { TelegramBridge } from '../src/bridge.ts'
import type { TelegramClientLike, TelegramUpdate } from '../src/client.ts'
import { MSG } from '../src/commands.ts'

type SentMessage = { chatId: number; text: string; parseMode?: string }

function fakeClient(
  sent: SentMessage[],
  overrides: Partial<TelegramClientLike> = {},
): TelegramClientLike {
  return {
    getMe: async () => ({ id: 1 }),
    getUpdates: async () => [],
    sendMessage: async (chatId, text, parseMode) => {
      sent.push({ chatId, text, parseMode })
      return { message_id: 1, date: 0, chat: { id: chatId, type: 'private' }, text }
    },
    sendChatAction: async () => true,
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

function fakeAgents(track: {
  createCount: number
  disposeCount: number
  sessionIds: string[]
  followups: UserMessage[][]
}) {
  return {
    create: async (options: CreateAgentOptions) => {
      track.createCount += 1
      track.sessionIds.push(String(options.sessionId))
      const followups: UserMessage[] = []
      track.followups.push(followups)
      return {
        agent: {
          followup(message: UserMessage) {
            followups.push(message)
          },
        },
        dispose: async () => {
          track.disposeCount += 1
        },
      }
    },
  }
}

function bridgeCtx(
  agents: ReturnType<typeof fakeAgents>,
  onSessionEvent?: (session: { id: ReturnType<typeof SessionId> }, event: unknown) => void,
) {
  return {
    logger: { warn() {}, error() {} },
    agents,
    on(event: string, listener: (session: { id: ReturnType<typeof SessionId> }, event: unknown) => void) {
      if (event === 'session/event' && onSessionEvent) {
        onSessionEvent = listener
      }
      return () => {}
    },
    _fireSessionEvent(session: { id: ReturnType<typeof SessionId> }, ev: unknown) {
      onSessionEvent?.(session, ev)
    },
  }
}

test('unauthorized user gets denied and no agent', async () => {
  const sent: SentMessage[] = []
  let createCount = 0
  const ctx = {
    logger: { warn() {}, error() {} },
    agents: {
      create: async () => {
        createCount += 1
        throw new Error('should not create')
      },
    },
    on() {
      return () => {}
    },
  }
  const bridge = new TelegramBridge(ctx as never, {
    token: 't',
    allowedUserIds: [1],
    allowAllUsers: false,
    client: fakeClient(sent),
    sleep: async () => {},
  })
  await bridge.processUpdate(messageUpdate(99, 99, 'hi'))
  assert.equal(createCount, 0)
  assert.equal(sent[0]?.text, MSG.DENIED)
})

test('/help sends help without creating agent', async () => {
  const sent: SentMessage[] = []
  const track = { createCount: 0, disposeCount: 0, sessionIds: [] as string[], followups: [] as UserMessage[][] }
  const bridge = new TelegramBridge(bridgeCtx(fakeAgents(track)) as never, {
    token: 't',
    allowedUserIds: [1],
    allowAllUsers: false,
    client: fakeClient(sent),
    sleep: async () => {},
  })
  await bridge.processUpdate(messageUpdate(42, 1, '/help'))
  assert.equal(track.createCount, 0)
  assert.equal(sent[0]?.text, MSG.HELP)
})

test('first plain text creates agent then followups', async () => {
  const sent: SentMessage[] = []
  const track = { createCount: 0, disposeCount: 0, sessionIds: [] as string[], followups: [] as UserMessage[][] }
  const bridge = new TelegramBridge(bridgeCtx(fakeAgents(track)) as never, {
    token: 't',
    allowedUserIds: [1],
    allowAllUsers: false,
    client: fakeClient(sent),
    sleep: async () => {},
  })
  await bridge.processUpdate(messageUpdate(42, 1, 'hello'))
  assert.equal(track.createCount, 1)
  assert.equal(track.sessionIds[0], 'telegram:42')
  assert.equal(track.followups.length, 1)
  assert.equal((track.followups[0]![0]!.content[0] as { text: string }).text, 'hello')
})

test('second plain text in same chat only followups', async () => {
  const sent: SentMessage[] = []
  const track = { createCount: 0, disposeCount: 0, sessionIds: [] as string[], followups: [] as UserMessage[][] }
  const bridge = new TelegramBridge(bridgeCtx(fakeAgents(track)) as never, {
    token: 't',
    allowedUserIds: [1],
    allowAllUsers: false,
    client: fakeClient(sent),
    sleep: async () => {},
  })
  await bridge.processUpdate(messageUpdate(42, 1, 'hello'))
  await bridge.processUpdate(messageUpdate(42, 1, 'again', 2))
  assert.equal(track.createCount, 1)
  assert.equal(track.followups.length, 1)
  assert.equal(track.followups[0]!.length, 2)
  assert.equal((track.followups[0]![1]!.content[0] as { text: string }).text, 'again')
})

test('/new disposes previous handle and creates fresh session', async () => {
  const sent: SentMessage[] = []
  const track = { createCount: 0, disposeCount: 0, sessionIds: [] as string[], followups: [] as UserMessage[][] }
  const bridge = new TelegramBridge(bridgeCtx(fakeAgents(track)) as never, {
    token: 't',
    allowedUserIds: [1],
    allowAllUsers: false,
    client: fakeClient(sent),
    sleep: async () => {},
  })
  await bridge.processUpdate(messageUpdate(42, 1, 'hello'))
  await bridge.processUpdate(messageUpdate(42, 1, '/new', 2))
  assert.equal(track.disposeCount, 1)
  assert.equal(track.createCount, 2)
  assert.equal(track.sessionIds[0], 'telegram:42')
  assert.match(track.sessionIds[1]!, /^telegram:42:\d+$/)
  assert.equal(sent.at(-1)?.text, MSG.NEW_SESSION)
})

test('turn/start sends typing for matching session', async () => {
  const sent: SentMessage[] = []
  const actions: Array<{ chatId: number; action: string }> = []
  const track = { createCount: 0, disposeCount: 0, sessionIds: [] as string[], followups: [] as UserMessage[][] }
  let fire: ((session: { id: ReturnType<typeof SessionId> }, event: unknown) => void) | undefined
  const ctx = {
    logger: { warn() {}, error() {} },
    agents: fakeAgents(track),
    on(_event: string, listener: (session: { id: ReturnType<typeof SessionId> }, event: unknown) => void) {
      fire = listener
      return () => {}
    },
  }
  const bridge = new TelegramBridge(ctx as never, {
    token: 't',
    allowedUserIds: [1],
    allowAllUsers: false,
    client: fakeClient(sent, {
      sendChatAction: async (chatId, action) => {
        actions.push({ chatId, action })
        return true
      },
    }),
    sleep: async () => {},
  })
  bridge.start()
  await bridge.processUpdate(messageUpdate(42, 1, 'hello'))
  fire!({ id: SessionId(track.sessionIds[0]!) }, { type: 'turn/start', data: { turn: 1 } })
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(actions, [{ chatId: 42, action: 'typing' }])
  await bridge.stop()
})

test('assistant/message delivers HTML chunks for matching session', async () => {
  const sent: SentMessage[] = []
  const track = { createCount: 0, disposeCount: 0, sessionIds: [] as string[], followups: [] as UserMessage[][] }
  let fire: ((session: { id: ReturnType<typeof SessionId> }, event: unknown) => void) | undefined
  const ctx = {
    logger: { warn() {}, error() {} },
    agents: fakeAgents(track),
    on(_event: string, listener: (session: { id: ReturnType<typeof SessionId> }, event: unknown) => void) {
      fire = listener
      return () => {}
    },
  }
  const bridge = new TelegramBridge(ctx as never, {
    token: 't',
    allowedUserIds: [1],
    allowAllUsers: false,
    client: fakeClient(sent),
    sleep: async () => {},
  })
  bridge.start()
  await bridge.processUpdate(messageUpdate(42, 1, 'hello'))
  fire!(
    { id: SessionId(track.sessionIds[0]!) },
    {
      type: 'assistant/message',
      data: {
        turn: 1,
        step: 1,
        message: {
          content: [{ type: 'text', text: '**bold**' }],
        },
      },
    },
  )
  await new Promise((resolve) => setImmediate(resolve))
  const reply = sent.find((m) => m.parseMode === 'HTML')
  assert.ok(reply)
  assert.match(reply!.text, /<b>bold<\/b>/)
  await bridge.stop()
})

test('HTML send failure retries plain text for that chunk', async () => {
  const sent: SentMessage[] = []
  const track = { createCount: 0, disposeCount: 0, sessionIds: [] as string[], followups: [] as UserMessage[][] }
  let fire: ((session: { id: ReturnType<typeof SessionId> }, event: unknown) => void) | undefined
  const ctx = {
    logger: { warn() {}, error() {} },
    agents: fakeAgents(track),
    on(_event: string, listener: (session: { id: ReturnType<typeof SessionId> }, event: unknown) => void) {
      fire = listener
      return () => {}
    },
  }
  const bridge = new TelegramBridge(ctx as never, {
    token: 't',
    allowedUserIds: [1],
    allowAllUsers: false,
    client: fakeClient(sent, {
      sendMessage: async (chatId, text, parseMode) => {
        if (parseMode === 'HTML') throw new Error('bad html')
        sent.push({ chatId, text, parseMode })
        return { message_id: 1, date: 0, chat: { id: chatId, type: 'private' }, text }
      },
    }),
    sleep: async () => {},
  })
  bridge.start()
  await bridge.processUpdate(messageUpdate(42, 1, 'hello'))
  fire!(
    { id: SessionId(track.sessionIds[0]!) },
    {
      type: 'assistant/message',
      data: {
        turn: 1,
        step: 1,
        message: {
          content: [{ type: 'text', text: 'plain chunk' }],
        },
      },
    },
  )
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(sent.length, 1)
  assert.equal(sent[0]?.parseMode, undefined)
  assert.equal(sent[0]?.text, 'plain chunk')
  await bridge.stop()
})

test('stop disposes all chat handles', async () => {
  const sent: SentMessage[] = []
  const track = { createCount: 0, disposeCount: 0, sessionIds: [] as string[], followups: [] as UserMessage[][] }
  const bridge = new TelegramBridge(bridgeCtx(fakeAgents(track)) as never, {
    token: 't',
    allowedUserIds: [1],
    allowAllUsers: false,
    client: fakeClient(sent),
    sleep: async () => {},
  })
  await bridge.processUpdate(messageUpdate(42, 1, 'one'))
  await bridge.processUpdate(messageUpdate(43, 1, 'two', 2))
  await bridge.stop()
  assert.equal(track.disposeCount, 2)
})
