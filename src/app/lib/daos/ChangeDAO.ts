import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { ChangeAction, ChangeTargetType } from '@prisma/client'
import { Change } from '@/types/Change'
import { InputJsonValue } from '@prisma/client/runtime/library'

export class ChangeDAO extends AbstractDAO {
  /**
   * Create a new Change entry
   */
  async createChange(params: {
    action: ChangeAction
    targetType: ChangeTargetType
    targetUid: string
    path?: string | null
    parameters: InputJsonValue
    personUid: string
  }): Promise<Change> {
    const {
      action,
      targetType,
      targetUid,
      path = null,
      parameters,
      personUid,
    } = params

    const dbChange = await this.prismaClient.change.create({
      data: {
        action,
        targetType,
        targetUid,
        path,
        parameters,
        personUid,
      },
    })

    return Change.fromDbChange(dbChange)
  }

  /**
   * Fetch changes that are not dispatched yet
   */
  async fetchUndispatchedChanges(limit = 100): Promise<Change[]> {
    const dbChanges = await this.prismaClient.change.findMany({
      where: { dispatched: false },
      orderBy: { timestamp: 'asc' },
      take: limit,
    })

    return dbChanges.map(Change.fromDbChange)
  }

  /**
   * Mark a change as dispatched
   */
  async markChangeAsDispatched(id: string): Promise<void> {
    await this.prismaClient.change.update({
      where: { id },
      data: { dispatched: true },
    })
  }

  /**
   * Mark multiple changes as dispatched
   */
  async markChangesAsDispatched(ids: string[]): Promise<void> {
    await this.prismaClient.change.updateMany({
      where: { id: { in: ids } },
      data: { dispatched: true },
    })
  }
}
