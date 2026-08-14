import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveApiProxy } from '../src/apiproxy.ts'

test('resolveApiProxy uses ctx.get and avoids bare ctx.apiProxy', () => {
  const api = { sessions: {} }
  let touchedBare = false
  const ctx = {
    get(name: string) {
      return name === 'apiProxy' ? api : undefined
    },
    get apiProxy() {
      touchedBare = true
      throw new Error('cannot get property "apiProxy" without inject')
    },
  }
  assert.equal(resolveApiProxy(ctx as any), api)
  assert.equal(touchedBare, false)
})

test('resolveApiProxy falls back to own-property mock', () => {
  const api = { sessions: {} }
  const ctx = { apiProxy: api }
  assert.equal(resolveApiProxy(ctx as any), api)
})
