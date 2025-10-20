import { Action, ActionTargetType, ActionType } from '@/types/Action'
import { AmqpConnection } from '@/lib/amqp/AmqpConnection'
import { ActionDAO } from '@/lib/daos/ActionDAO'

export class ActionDispatchService {
  private connection: AmqpConnection
  private actionDAO: ActionDAO

  constructor(connection: AmqpConnection) {
    this.connection = connection
    this.actionDAO = new ActionDAO()
  }

  /**
   * Dispatch a single action by database id.
   * - Skips if not found or already dispatched.
   */
  async dispatchAction(id: string, skipIfDispatched = false): Promise<void> {
    const dbAction = await this.actionDAO.getDbActionById(id)

    if (!dbAction) {
      console.warn(`⚠No action found for id=${id}`)
      return
    }
    if (skipIfDispatched && dbAction.dispatched) {
      console.log(`ℹAction ${id} already dispatched — skipping.`)
      return
    }

    const action = Action.fromDbAction(dbAction) // normalized domain object

    await this.publish(action)
    console.log(`✅ Action ${id} dispatched successfully.`)
    await this.actionDAO.markActionAsDispatched(id)
  }

  /**
   * Dispatch all undispatched actions in the database.
   */
  async dispatchUndispatchedActions(): Promise<void> {
    let undispatched: Action[]
    try {
      undispatched = await this.actionDAO.fetchUndispatchedActions(100)
      if (undispatched.length === 0) {
        console.log('No undispatched actions found.')
        return
      }
    } catch (err) {
      console.error('Error fetching undispatched actions:', err)
      return
    }

    console.log(`Dispatching ${undispatched.length} undispatched actions...`)

    for (const action of undispatched) {
      try {
        await this.publish(action)
        console.log(`Change ${action.id} dispatched successfully.`)
        await this.actionDAO.markActionAsDispatched(action.id)
      } catch (err) {
        console.error(`Failed to dispatch change ${action.id}:`, err)
      }
    }
  }

  async dispatchAllActions(): Promise<void> {
    let allActions: Action[]
    try {
      allActions = await this.actionDAO.fetchAllActions()
      if (allActions.length === 0) {
        console.log('No actions found.')
        return
      }
    } catch (err) {
      console.error('Error fetching all actions:', err)
      return
    }

    console.log(`Dispatching ${allActions.length} actions...`)

    for (const action of allActions) {
      try {
        await this.publish(action)
        console.log(`Action ${action.id} dispatched successfully.`)
        await this.actionDAO.markActionAsDispatched(action.id)
      } catch (err) {
        console.error(`Failed to dispatch action ${action.id}:`, err)
      }
    }
  }

  private async publish(action: Action): Promise<void> {
    const message = this.buildJSONMessage(action)
    const routingKey = this.buildRoutingKey(
      action.targetType,
      action.actionType,
    )
    await this.connection.publish('graph', routingKey, message)
  }

  private buildJSONMessage(action: Action): string {
    return JSON.stringify({
      id: action.id,
      actionType: action.actionType,
      targetType: action.targetType,
      targetUid: action.targetUid,
      path: action.path,
      parameters: action.parameters,
      timestamp: action.timestamp.toISOString(),
      personUid: action.personUid,
      application: 'sovisuplus',
    })
  }

  private buildRoutingKey(
    targetType: ActionTargetType,
    action: ActionType,
  ): string {
    switch (targetType) {
      case ActionTargetType.DOCUMENT:
        return `task.documents.document.${action.toLowerCase()}`
      case ActionTargetType.PERSON:
        return `task.people.person.${action.toLowerCase()}`
      case ActionTargetType.HARVESTING:
        return `task.people.documents.${action.toLowerCase()}`
      default:
        throw new Error(`Unsupported target type: ${targetType}`)
    }
  }
}
