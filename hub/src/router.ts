import { randomUUID } from "node:crypto";
import type { Message } from "./types.js";
import { isUserRegistered, getRegisteredUsers } from "./auth.js";
import { deliverMessage } from "./polling.js";

const messageQueues = new Map<string, Message[]>();

export function ensureQueue(name: string): void {
  if (!messageQueues.has(name)) {
    messageQueues.set(name, []);
  }
}

export function removeQueue(name: string): void {
  messageQueues.delete(name);
}

export function drainQueue(name: string): Message[] {
  const queue = messageQueues.get(name);
  if (!queue || queue.length === 0) return [];
  const messages = [...queue];
  queue.length = 0;
  return messages;
}

export function routeMessage(
  from: string,
  to: string,
  content: string,
): Message {
  if (to === "@all") {
    return broadcastMessage(from, content);
  }

  const targetName = to.startsWith("@") ? to.slice(1) : to;

  if (!isUserRegistered(targetName)) {
    throw new Error(`User "${targetName}" is not connected`);
  }

  const message: Message = {
    id: randomUUID(),
    from,
    to: targetName,
    content,
    timestamp: Date.now(),
  };

  // Deliver to all connected users (except sender) so everyone can follow the conversation
  const allUsers = getRegisteredUsers().filter((u) => u !== from);
  for (const user of allUsers) {
    enqueueAndDeliver(user, message);
  }
  return message;
}

function broadcastMessage(from: string, content: string): Message {
  const users = getRegisteredUsers().filter((u) => u !== from);
  const message: Message = {
    id: randomUUID(),
    from,
    to: "@all",
    content,
    timestamp: Date.now(),
  };

  for (const user of users) {
    enqueueAndDeliver(user, message);
  }
  return message;
}

function enqueueAndDeliver(targetName: string, message: Message): void {
  ensureQueue(targetName);
  const queue = messageQueues.get(targetName)!;
  queue.push(message);
  deliverMessage(targetName);
}
