import { WebSocketServer } from 'ws'
import { WebSocketNotifier } from '@/lib/websocket/WebSocketNotifier'

export function startWebSocketServer(port: number): WebSocketServer {
  const wss = new WebSocketServer({ port })
  WebSocketNotifier.attach(wss)

  setInterval(() => {
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(
          JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString(),
          }),
        )
      }
    }
  }, 30000)

  console.log(`WebSocket server listening on ws://localhost:${port}`)
  return wss
}
