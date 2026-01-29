import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';

interface ClientData {
  id: string;
  connectedAt: number;
}

const clients = new Map<WebSocket, ClientData>();
let wss: WebSocketServer | null = null;

export function initWebSocket(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/stream' });

  wss.on('connection', (ws: WebSocket) => {
    const clientData: ClientData = {
      id: randomUUID(),
      connectedAt: Date.now(),
    };
    clients.set(ws, clientData);
    console.log(`[WebSocket] Client connected: ${clientData.id} (total: ${clients.size})`);

    ws.send(JSON.stringify({ type: 'connected', clientId: clientData.id }));

    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch {
        console.error('[WebSocket] Failed to parse message:', message.toString());
      }
    });

    ws.on('close', () => {
      const data = clients.get(ws);
      clients.delete(ws);
      console.log(`[WebSocket] Client disconnected: ${data?.id} (total: ${clients.size})`);
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Client error:', error);
      clients.delete(ws);
    });
  });

  return wss;
}

export function broadcastEvent(event: Record<string, unknown>): void {
  const message = JSON.stringify(event);
  let sent = 0;

  for (const [ws, _data] of clients) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sent++;
      }
    } catch (error) {
      console.error('[WebSocket] Failed to send to client:', error);
      clients.delete(ws);
    }
  }

  if (sent > 0) {
    console.log(`[WebSocket] Broadcast to ${sent} clients:`, event.type);
  }
}

export function getConnectedClientCount(): number {
  return clients.size;
}
