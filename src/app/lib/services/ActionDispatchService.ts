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

  async dispatchActions(): Promise<void> {
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
        const message = this.buildJSONMessage(action)

        const routingKey = this.buildRoutingKey(
          action.targetType,
          action.actionType,
        )
        await this.connection.publish('graph', routingKey, message)

        console.log(`Change ${action.id} dispatched successfully.`)

        await this.actionDAO.markActionAsDispatched(action.id)
      } catch (err) {
        console.error(`Failed to dispatch change ${action.id}:`, err)
      }
    }
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
        return `task.person.documents.${action.toLowerCase()}`
      default:
        throw new Error(`Unsupported target type: ${targetType}`)
    }
  }
}
