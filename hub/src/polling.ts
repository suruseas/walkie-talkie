import type { ServerResponse } from "node:http";
import type { PendingPoll } from "./types.js";
import { drainQueue } from "./router.js";

const POLL_TIMEOUT_MS = 3_600_000; // 1 hour
const pendingPolls = new Map<string, PendingPoll>();

export function addPoll(userName: string, res: ServerResponse): void {
  removePoll(userName);

  const timer = setTimeout(() => {
    pendingPolls.delete(userName);
    res.writeHead(204);
    res.end();
  }, POLL_TIMEOUT_MS);

  pendingPolls.set(userName, { userName, res, timer });

  // Check if there are already queued messages
  const messages = drainQueue(userName);
  if (messages.length > 0) {
    clearTimeout(timer);
    pendingPolls.delete(userName);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ messages }));
  }
}

export function deliverMessage(userName: string): void {
  const poll = pendingPolls.get(userName);
  if (!poll) return;

  const messages = drainQueue(userName);
  if (messages.length === 0) return;

  clearTimeout(poll.timer);
  pendingPolls.delete(userName);

  poll.res.writeHead(200, { "Content-Type": "application/json" });
  poll.res.end(JSON.stringify({ messages }));
}

export function removePoll(userName: string): void {
  const poll = pendingPolls.get(userName);
  if (poll) {
    clearTimeout(poll.timer);
    pendingPolls.delete(userName);
    if (!poll.res.writableEnded) {
      poll.res.writeHead(204);
      poll.res.end();
    }
  }
}
