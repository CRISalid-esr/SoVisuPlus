import { Change } from '@/types/Change'
import AmqpConnection from '@/lib/amqp/AmqpConnection'
import { ChangeDAO } from '@/lib/daos/ChangeDAO'
import {
  ChangeAction as DbChangeAction,
  ChangeTargetType as DbChangeTargetType,
} from '@prisma/client'

export class ChangeDispatchService {
  private connection: AmqpConnection
  private changeDAO: ChangeDAO

  constructor(connection: AmqpConnection) {
    this.connection = connection
    this.changeDAO = new ChangeDAO()
  }

  async dispatchChanges(): Promise<void> {
    let undispatched: Change[]
    try {
      undispatched = await this.changeDAO.fetchUndispatchedChanges(100)
      if (undispatched.length === 0) {
        console.log('No undispatched changes found.')
        return
      }
    } catch (err) {
      console.error('Error fetching undispatched changes:', err)
      return
    }

    console.log(`Dispatching ${undispatched.length} undispatched changes...`)

    for (const change of undispatched) {
      try {
        const message = JSON.stringify({
          id: change.id,
          action: change.action,
          targetType: change.targetType,
          targetUid: change.targetUid,
          path: change.path,
          parameters: change.parameters,
          timestamp: change.timestamp.toISOString(),
          personUid: change.personUid,
          application: 'sovisuplus',
        })

        const routingKey = this.buildRoutingKey(
          change.targetType,
          change.action,
        )
        await this.connection.publish('graph', routingKey, message)

        console.log(`Change ${change.id} dispatched successfully.`)

        await this.changeDAO.markChangeAsDispatched(change.id)
      } catch (err) {
        console.error(`Failed to dispatch change ${change.id}:`, err)
      }
    }
  }

  private buildRoutingKey(
    targetType: DbChangeTargetType,
    action: DbChangeAction,
  ): string {
    switch (targetType) {
      case DbChangeTargetType.DOCUMENT:
        return `task.documents.document.${action.toLowerCase()}`
      default:
        throw new Error(`Unsupported target type: ${targetType}`)
    }
  }
}
