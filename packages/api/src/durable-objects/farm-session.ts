import { DurableObject } from 'cloudflare:workers';

interface SessionEvent {
  seq: number;
  type: string;
  data: unknown;
  timestamp: string;
}

/**
 * Farm-wide session DO for broadcasting farm-level events
 * (new member joined, device status change, global alerts, etc.)
 */
export class FarmSessionDO extends DurableObject {
  private sessions: Map<string, WebSocket> = new Map();
  private sequenceNumber = 0;
  private eventBuffer: SessionEvent[] = [];
  private readonly MAX_BUFFER = 50;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(url);
    }

    if (request.method === 'POST') {
      return this.handleBroadcast(request);
    }

    return new Response('Not found', { status: 404 });
  }

  private handleWebSocket(url: URL): Response {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const userId = url.searchParams.get('userId') ?? 'anonymous';
    const lastSeq = parseInt(url.searchParams.get('lastSeq') ?? '0', 10);

    this.ctx.acceptWebSocket(server);
    this.sessions.set(userId, server);

    // Replay missed events
    if (lastSeq > 0) {
      const missed = this.eventBuffer.filter(e => e.seq > lastSeq);
      for (const event of missed) {
        server.send(JSON.stringify(event));
      }
    }

    server.addEventListener('close', () => {
      this.sessions.delete(userId);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    const body = await request.json() as { type: string; data: unknown };
    this.sequenceNumber++;

    const event: SessionEvent = {
      seq: this.sequenceNumber,
      type: body.type,
      data: body.data,
      timestamp: new Date().toISOString(),
    };

    this.eventBuffer.push(event);
    if (this.eventBuffer.length > this.MAX_BUFFER) {
      this.eventBuffer.shift();
    }

    const message = JSON.stringify(event);
    for (const [id, ws] of this.sessions) {
      try { ws.send(message); } catch { this.sessions.delete(id); }
    }

    return new Response(JSON.stringify({ seq: this.sequenceNumber }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
