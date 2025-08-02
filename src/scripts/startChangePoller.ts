import { ActionDispatchService } from '@/lib/services/ActionDispatchService'
import { AmqpConnection } from '@/lib/amqp/AmqpConnection'

export function startChangePoller(connection: AmqpConnection): void {
  const dispatcher = new ActionDispatchService(connection)
  const pollIntervalMs = 3000

  const pollLoop = async () => {
    try {
      await dispatcher.dispatchActions()
    } catch (err) {
      console.error('❌ Error dispatching DB changes:', err)
    } finally {
      setTimeout(pollLoop, pollIntervalMs)
    }
  }

  pollLoop()
}
