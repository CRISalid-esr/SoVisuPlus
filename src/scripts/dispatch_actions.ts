import { parseArgs } from 'node:util'
import { AmqpConnection } from '@/lib/amqp/AmqpConnection'
import { ActionDispatchService } from '@/lib/services/ActionDispatchService'

const main = async () => {
  const { positionals } = parseArgs({ allowPositionals: true })
  const ids = positionals

  const connection = new AmqpConnection()
  await connection.connect()
  const dispatcher = new ActionDispatchService(connection)

  if (ids.length === 0) {
    console.log('Dispatching all undispatched actions...')
    await dispatcher.dispatchAllActions()
  } else {
    console.log(
      `Dispatching ${ids.length} specific action(s): ${ids.join(', ')}`,
    )
    for (const id of ids) {
      try {
        await dispatcher.dispatchAction(id)
      } catch (err) {
        console.error(`❌ Failed to dispatch action ${id}:`, err)
      }
    }
  }

  await connection.close()
  console.log('✅ Dispatch finished.')
}

main().catch((err) => {
  console.error('❌ dispatch_actions failed:', err)
  process.exit(1)
})
