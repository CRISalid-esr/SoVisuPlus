const amqp = require('amqplib/callback_api')
;(async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL)
    const channel = await connection.createChannel()
    const queue = 'your_queue_name'

    await channel.assertQueue(queue, { durable: true })
    console.log(`Listening for messages on ${queue}...`)

    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        const data = JSON.parse(msg.content.toString())
        console.log(`Message received:`, data)

        // Update your database using Prisma
        const { PrismaClient } = require('@prisma/client')
        const prisma = new PrismaClient()

        try {
          await prisma.yourModel.create({
            data,
          })
          channel.ack(msg) // Acknowledge the message
        } catch (error) {
          console.error(`Database error:`, error)
          channel.nack(msg, false, true) // Retry the message
        } finally {
          await prisma.$disconnect()
        }
      }
    })
  } catch (error) {
    console.error(`RabbitMQ error:`, error)
    process.exit(1)
  }
})()
