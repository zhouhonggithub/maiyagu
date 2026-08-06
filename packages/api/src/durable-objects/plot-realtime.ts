import { DurableObject } from 'cloudflare:workers';

interface RealtimeEvent {
  seq: number;
  type: string;
  data: unknown;
  timestamp: string;
}

export class PlotRealtimeDO extends DurableObject {
  private sessions: Map<string, WebSocket> = new Map();
  private sequenceNumber = 0;
  private eventBuffer: RealtimeEvent[] = [];
  private readonly MAX_BUFFER = 100;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request, url);
    }

    // HTTP POST: push event to all connected clients
    if (request.method === 'POST') {
      return this.handlePushEvent(request);
    }

    return new Response('Not found', { status: 404 });
  }

  private handleWebSocket(_request: Request, url: URL): Response {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const memberId = url.searchParams.get('memberId') ?? 'anonymous';
    const lastSeq = parseInt(url.searchParams.get('lastSeq') ?? '0', 10);

    this.ctx.acceptWebSocket(server);
    this.sessions.set(memberId, server);

    // Replay missed events
    if (lastSeq > 0) {
      const missed = this.eventBuffer.filter(e => e.seq > lastSeq);
      for (const event of missed) {
        server.send(JSON.stringify(event));
      }
    }

    server.addEventListener('close', () => {
      this.sessions.delete(memberId);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handlePushEvent(request: Request): Promise<Response> {
    const body = await request.json() as { type: string; data: unknown };
    this.sequenceNumber++;

    const event: RealtimeEvent = {
      seq: this.sequenceNumber,
      type: body.type,
      data: body.data,
      timestamp: new Date().toISOString(),
    };

    // Buffer for replay
    this.eventBuffer.push(event);
    if (this.eventBuffer.length > this.MAX_BUFFER) {
      this.eventBuffer.shift();
    }

    // Broadcast to all connected
    const message = JSON.stringify(event);
    for (const [id, ws] of this.sessions) {
      try { ws.send(message); } catch { this.sessions.delete(id); }
    }

    return new Response(JSON.stringify({ seq: this.sequenceNumber }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
