import assert from 'node:assert/strict'
import test from 'node:test'
import { escapeHtml, markdownToHtml, splitMessage } from '../src/format.ts'

test('escapeHtml escapes five special chars', () => {
  assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;')
})

test('markdownToHtml converts fence bold and inline code', () => {
  const html = markdownToHtml('hi **x** and `y`\n```\nz\n```')
  assert.match(html, /<b>x<\/b>/)
  assert.match(html, /<code>y<\/code>/)
  assert.match(html, /<pre>z<\/pre>/)
})

test('markdownToHtml keeps unbalanced fence without pre', () => {
  const html = markdownToHtml('start ``` not closed')
  assert.equal(html.includes('<pre>'), false)
  assert.match(html, /start/)
})

test('splitMessage prefers newline within window', () => {
  const text = 'aaaa\nbbbb\ncccc'
  assert.deepEqual(splitMessage(text, 6), ['aaaa\n', 'bbbb\n', 'cccc'])
})

test('splitMessage hard-cuts when no break', () => {
  assert.deepEqual(splitMessage('abcdefghij', 4), ['abcd', 'efgh', 'ij'])
})
