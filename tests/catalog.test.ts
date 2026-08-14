import assert from 'node:assert/strict'
import test from 'node:test'
import {
  visibleSessionsForWorkspace,
  workspacesWithVisibleSessions,
  type CatalogSnapshot,
} from '../src/catalog.ts'

test('visible sessions exclude archived blank and subagent', () => {
  const catalog: CatalogSnapshot = {
    complete: true,
    archivedIds: new Set(['arch']),
    sessionsById: new Map([
      ['ok', { sessionId: 'ok', title: 'OK', blank: false, running: true, updatedAt: 1 }],
      ['arch', { sessionId: 'arch', title: 'Arch', blank: false, running: false, updatedAt: 1 }],
      ['blank', { sessionId: 'blank', title: 'Blank', blank: true, running: false, updatedAt: 1 }],
      ['sub', { sessionId: 'sub', title: 'Sub', blank: false, running: false, origin: 'subagent', updatedAt: 1 }],
    ]),
    workspaces: [{
      id: 'w',
      title: 'W',
      path: '/w',
      sessionIds: ['ok', 'arch', 'blank', 'sub', 'missing'],
    }],
  }
  const rows = visibleSessionsForWorkspace(catalog, catalog.workspaces[0]!)
  assert.deepEqual(rows.map((r) => r.sessionId), ['ok'])
  assert.equal(workspacesWithVisibleSessions(catalog).length, 1)
})
