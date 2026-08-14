import assert from 'node:assert/strict'
import test from 'node:test'
import { MSG, parseCommand } from '../src/commands.ts'

test('parse slash commands', () => {
  assert.equal(parseCommand('/start').type, 'start')
  assert.equal(parseCommand('/help extra').type, 'help')
  assert.equal(parseCommand('/new').type, 'new')
  assert.equal(parseCommand('/clear').type, 'new')
  assert.equal(parseCommand('/foo').type, 'unknown')
  assert.equal(parseCommand('hello').type, 'plain')
})

test('Chinese copy is non-empty', () => {
  assert.ok(MSG.DENIED.includes('权限') || MSG.DENIED.includes('授权'))
  assert.ok(MSG.HELP.includes('/new'))
  assert.ok(MSG.WELCOME.length > 0)
})
