import type { ServerResponse } from "node:http";

export type HubEvent =
  | { type: "message"; from: string; to: string; content: string; timestamp: number }
  | { type: "join"; name: string; timestamp: number }
  | { type: "leave"; name: string; timestamp: number };

const clients = new Set<ServerResponse>();

export function addSSEClient(res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("\n");
  clients.add(res);
  res.on("close", () => clients.delete(res));
}

export function broadcast(event: HubEvent): void {
  const data = JSON.stringify(event);
  for (const client of clients) {
    client.write(`data: ${data}\n\n`);
  }
}
