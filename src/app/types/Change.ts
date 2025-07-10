// file: src/app/types/Change.ts
import {
  Change as DbChange,
  ChangeAction as DbChangeAction,
  ChangeTargetType as DbChangeTargetType,
} from '@prisma/client'

type ChangeParameters = Record<string, unknown>

class Change {
  constructor(
    public id: string,
    public action: DbChangeAction,
    public targetType: DbChangeTargetType,
    public targetUid: string,
    public path: string | null,
    public parameters: ChangeParameters | null,
    public timestamp: Date,
  ) {}

  static fromDbChange(dbChange: DbChange): Change {
    return new Change(
      dbChange.id,
      dbChange.action,
      dbChange.targetType,
      dbChange.targetUid,
      dbChange.path,
      dbChange.parameters as ChangeParameters | null,
      dbChange.timestamp,
    )
  }
}

export { Change }
export {
  DbChangeAction as ChangeAction,
  DbChangeTargetType as ChangeTargetType,
}
