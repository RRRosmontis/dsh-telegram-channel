import assert from 'node:assert/strict'
import test from 'node:test'
import { isAuthorized } from '../src/auth.ts'

test('empty allowlist rejects even with userId', () => {
  assert.equal(isAuthorized({ allowAllUsers: false, allowedUserIds: [], userId: 1 }), false)
})

test('allowAllUsers accepts missing userId', () => {
  assert.equal(isAuthorized({ allowAllUsers: true, allowedUserIds: [], userId: undefined }), true)
})

test('allowlist match', () => {
  assert.equal(isAuthorized({ allowAllUsers: false, allowedUserIds: [42], userId: 42 }), true)
  assert.equal(isAuthorized({ allowAllUsers: false, allowedUserIds: [42], userId: 7 }), false)
})
