import assert from 'node:assert/strict'
import test from 'node:test'
import { extractLastTurn, formatLastTurn } from '../src/history.ts'

test('extractLastTurn pairs latest human user with following assistant', () => {
  const turn = extractLastTurn([
    {
      type: 'user/message',
      data: { source: { kind: 'plugin', plugin: 'x' }, content: [{ type: 'text', text: 'injected' }] },
    },
    {
      type: 'user/message',
      data: { source: { kind: 'user' }, content: [{ type: 'text', text: '第一问' }] },
    },
    {
      type: 'assistant/message',
      data: { message: { content: [{ type: 'text', text: '第一答' }] } },
    },
    {
      type: 'user/message',
      data: { source: { kind: 'user' }, content: [{ type: 'text', text: '第二问' }] },
    },
    {
      type: 'assistant/message',
      data: { message: { content: [{ type: 'text', text: '第二答' }] } },
    },
  ])
  assert.equal(turn.userText, '第二问')
  assert.equal(turn.assistantText, '第二答')
})

test('formatLastTurn renders sections', () => {
  const text = formatLastTurn({ userText: 'hi', assistantText: 'hello' })
  assert.match(text, /【用户】/)
  assert.match(text, /hi/)
  assert.match(text, /【助手】/)
  assert.match(text, /hello/)
})
