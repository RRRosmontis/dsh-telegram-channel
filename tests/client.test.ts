import assert from 'node:assert/strict'
import test from 'node:test'
import { TelegramClient } from '../src/client.ts'

test('getUpdates posts timeout and optional offset', async () => {
  const calls: Array<{ url: string; body: unknown }> = []
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body)) })
    return new Response(JSON.stringify({ ok: true, result: [] }), { status: 200 })
  }
  const client = new TelegramClient('SECRET-TOKEN', { fetch: fetchImpl, pollingTimeoutSec: 12 })
  await client.getUpdates(9)
  assert.match(calls[0]!.url, /\/botSECRET-TOKEN\/getUpdates$/)
  assert.deepEqual(calls[0]!.body, {
    timeout: 12,
    allowed_updates: ['message'],
    offset: 9,
  })
})

test('errors redact token', async () => {
  const fetchImpl: typeof fetch = async () => {
    throw new Error('boom SECRET-TOKEN leaked')
  }
  const client = new TelegramClient('SECRET-TOKEN', { fetch: fetchImpl })
  await assert.rejects(async () => client.getMe(), (err: Error) => {
    assert.equal(err.message.includes('SECRET-TOKEN'), false)
    assert.match(err.message, /\*\*\*/)
    return true
  })
})

test('empty token throws in constructor', () => {
  assert.throws(() => new TelegramClient(''), /token/)
})
