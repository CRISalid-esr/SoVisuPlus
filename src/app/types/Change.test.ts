import { Action, ActionTargetType, ActionType } from './Action'
import { describe, expect, it } from '@jest/globals'

describe('Change', () => {
  it('should correctly instantiate from DbAction using fromDbAction', () => {
    const dbAction = {
      id: 'uuid-1234',
      actionType: ActionType.UPDATE,
      targetType: ActionTargetType.DOCUMENT,
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

    const action = Action.fromDbAction(dbAction)

    expect(action).toBeInstanceOf(Action)
    expect(action.id).toBe('uuid-1234')
    expect(action.actionType).toBe(ActionType.UPDATE)
    expect(action.targetType).toBe(ActionTargetType.DOCUMENT)
    expect(action.targetUid).toBe('doc-5678')
    expect(action.path).toBe('titles')
    expect(action.parameters).toEqual({
      field: 'titles',
      value: [{ language: 'fr', value: 'Nouveau titre' }],
    })
    expect(action.timestamp.toISOString()).toBe('2025-07-05T10:00:00.000Z')
  })

  it('should handle null path and parameters', () => {
    const dbAction = {
      id: 'uuid-5678',
      actionType: ActionType.REMOVE,
      targetType: ActionTargetType.DOCUMENT,
      targetUid: 'doc-9999',
      path: null,
      parameters: null,
      personUid: 'person-1234',
      dispatched: false,
      timestamp: new Date(),
    }

    const change = Action.fromDbAction(dbAction)

    expect(change.path).toBeNull()
    expect(change.parameters).toBeNull()
  })
})
