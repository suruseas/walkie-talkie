import type { ServerResponse } from "node:http";

export type HubEvent =
  | { type: "message"; from: string; to: string; content: string; channel: string; timestamp: number }
  | { type: "join"; name: string; timestamp: number }
  | { type: "leave"; name: string; timestamp: number }
  | { type: "channel_create"; name: string; timestamp: number }
  | { type: "channel_join"; channel: string; userName: string; timestamp: number }
  | { type: "channel_leave"; channel: string; userName: string; timestamp: number }
  | { type: "channel_delete"; name: string; timestamp: number };

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds

const clients = new Set<ServerResponse>();
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function startHeartbeat(): void {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    for (const client of clients) {
      client.write(":\n\n");
    }
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat(): void {
  if (heartbeatTimer && clients.size === 0) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export function addSSEClient(res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("\n");
  clients.add(res);
  startHeartbeat();
  res.on("close", () => {
    clients.delete(res);
    stopHeartbeat();
  });
}

export function broadcast(event: HubEvent): void {
  const data = JSON.stringify(event);
  for (const client of clients) {
    client.write(`data: ${data}\n\n`);
  }
}
