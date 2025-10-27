import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { ActionTargetType, ActionType } from '@prisma/client'
import { Action } from '@/types/Action'
import { InputJsonValue } from '@prisma/client/runtime/library'

export class ActionDAO extends AbstractDAO {
  /**
   * Create a new Action entry
   */
  async createAction(params: {
    actionType: ActionType
    targetType: ActionTargetType
    targetUid: string
    path?: string | null
    parameters: InputJsonValue
    personUid: string
  }): Promise<Action> {
    const {
      actionType,
      targetType,
      targetUid,
      path = null,
      parameters,
      personUid,
    } = params

    const dbAction = await this.prismaClient.action.create({
      data: {
        actionType,
        targetType,
        targetUid,
        path,
        parameters,
        personUid,
      },
    })

    return Action.fromDbAction(dbAction)
  }

  /**
   * Get a DB action by its ID
   */
  async getDbActionById(id: string) {
    return this.prismaClient.action.findUnique({ where: { id } })
  }

  /**
   * Fetch actions that are not dispatched yet
   */
  async fetchUndispatchedActions(limit = 100): Promise<Action[]> {
    const dbActions = await this.prismaClient.action.findMany({
      where: { dispatched: false },
      orderBy: { timestamp: 'asc' },
      take: limit,
    })

    return dbActions.map(Action.fromDbAction)
  }

  /**
   * Fetch all actions
   */
  async fetchAllActions(): Promise<Action[]> {
    const dbActions = await this.prismaClient.action.findMany({
      orderBy: { timestamp: 'asc' },
    })

    return dbActions.map(Action.fromDbAction)
  }

  /**
   * Mark an action as dispatched
   */
  async markActionAsDispatched(id: string): Promise<void> {
    await this.prismaClient.action.update({
      where: { id },
      data: { dispatched: true },
    })
  }

  /**
   * Mark multiple actions as dispatched
   */
  async markActionsAsDispatched(ids: string[]): Promise<void> {
    await this.prismaClient.action.updateMany({
      where: { id: { in: ids } },
      data: { dispatched: true },
    })
  }
}
