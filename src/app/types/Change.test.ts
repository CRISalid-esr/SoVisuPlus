import { Change, ChangeAction, ChangeTargetType } from './Change'
import { describe, expect, it } from '@jest/globals'

describe('Change', () => {
  it('should correctly instantiate from DbChange using fromDbChange', () => {
    const dbChange = {
      id: 'uuid-1234',
      action: ChangeAction.UPDATE,
      targetType: ChangeTargetType.DOCUMENT,
      targetUid: 'doc-5678',
      path: 'titles',
      parameters: {
        field: 'titles',
        value: [{ language: 'fr', value: 'Nouveau titre' }],
      },
      timestamp: new Date('2025-07-05T10:00:00.000Z'),
      dispatched: false,
      personUid: 'person-1234',
    }

    const change = Change.fromDbChange(dbChange)

    expect(change).toBeInstanceOf(Change)
    expect(change.id).toBe('uuid-1234')
    expect(change.action).toBe(ChangeAction.UPDATE)
    expect(change.targetType).toBe(ChangeTargetType.DOCUMENT)
    expect(change.targetUid).toBe('doc-5678')
    expect(change.path).toBe('titles')
    expect(change.parameters).toEqual({
      field: 'titles',
      value: [{ language: 'fr', value: 'Nouveau titre' }],
    })
    expect(change.timestamp.toISOString()).toBe('2025-07-05T10:00:00.000Z')
  })

  it('should handle null path and parameters', () => {
    const dbChange = {
      id: 'uuid-5678',
      action: ChangeAction.REMOVE,
      targetType: ChangeTargetType.DOCUMENT,
      targetUid: 'doc-9999',
      path: null,
      parameters: null,
      personUid: 'person-1234',
      dispatched: false,
      timestamp: new Date(),
    }

    const change = Change.fromDbChange(dbChange)

    expect(change.path).toBeNull()
    expect(change.parameters).toBeNull()
  })
})
