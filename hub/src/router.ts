import { randomUUID } from "node:crypto";
import type { Message } from "./types.js";
import { isUserRegistered } from "./auth.js";
import { deliverMessage } from "./polling.js";
import { getChannelMembers, isChannelMember } from "./channels.js";

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
  channel = "#all",
): Message {
  const members = getChannelMembers(channel);

  if (to === "@all") {
    const message: Message = {
      id: randomUUID(),
      from,
      to: "@all",
      content,
      channel,
      timestamp: Date.now(),
    };

    // Deliver to all channel members except sender
    for (const user of members) {
      if (user !== from) {
        enqueueAndDeliver(user, message);
      }
    }
    return message;
  }

  const targetName = to.startsWith("@") ? to.slice(1) : to;

  if (!isUserRegistered(targetName)) {
    throw new Error(`User "${targetName}" is not connected`);
  }

  if (!isChannelMember(channel, targetName)) {
    throw new Error(`User "${targetName}" is not a member of ${channel}`);
  }

  const message: Message = {
    id: randomUUID(),
    from,
    to: targetName,
    content,
    channel,
    timestamp: Date.now(),
  };

  // Deliver to all channel members except sender
  for (const user of members) {
    if (user !== from) {
      enqueueAndDeliver(user, message);
    }
  }
  return message;
}

function enqueueAndDeliver(targetName: string, message: Message): void {
  ensureQueue(targetName);
  const queue = messageQueues.get(targetName)!;
  queue.push(message);
  deliverMessage(targetName);
}
