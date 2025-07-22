import WebSocket, { WebSocketServer } from 'ws'

export class WebSocketNotifier {
  private static wss: WebSocketServer | null = null

  static attach(wss: WebSocketServer) {
    this.wss = wss
  }

  static notifyClients(payload: object) {
    if (!this.wss) return

    const message = JSON.stringify(payload)
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    }
  }
}
