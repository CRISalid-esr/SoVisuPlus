import WebSocket, { WebSocketServer } from 'ws'
import { GenericEvent } from '@/types/GenericEvent'

export class WebSocketNotifier {
  private static wss: WebSocketServer | null = null

  static attach(wss: WebSocketServer) {
    this.wss = wss
  }

  static notifyClients(event: GenericEvent) {
    if (!this.wss) return

    const message = JSON.stringify(event)
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    }
  }
}
