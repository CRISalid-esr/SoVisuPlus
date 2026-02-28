import {
  Action as DbAction,
  ActionTargetType as DbActionTargetType,
  ActionType as DbActionType,
} from '@prisma/client'

type ActionParameters = Record<string, unknown>

class Action {
  constructor(
    public id: string,
    public actionType: DbActionType,
    public targetType: DbActionTargetType,
    public targetUid: string,
    public path: string | null,
    public parameters: ActionParameters | null,
    public timestamp: Date,
    public personUid?: string,
    public dispatched: boolean = false,
  ) {}

  static fromDbAction(dbAction: DbAction): Action {
    return new Action(
      dbAction.id,
      dbAction.actionType,
      dbAction.targetType,
      dbAction.targetUid,
      dbAction.path,
      dbAction.parameters as ActionParameters | null,
      dbAction.timestamp,
      dbAction.personUid,
      dbAction.dispatched || false,
    )
  }
}

export { Action }
export { DbActionType as ActionType, DbActionTargetType as ActionTargetType }
