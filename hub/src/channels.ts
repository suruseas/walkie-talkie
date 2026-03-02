import { dbGetChannel } from "./db.js";

const channelMembers = new Map<string, Set<string>>();

export function initGeneralChannel(): void {
  if (!channelMembers.has("#all")) {
    channelMembers.set("#all", new Set());
  }
}

export function joinChannel(channel: string, userName: string): void {
  const dbChannel = dbGetChannel(channel);
  if (!dbChannel) {
    throw new Error(`Channel "${channel}" does not exist`);
  }
  let members = channelMembers.get(channel);
  if (!members) {
    members = new Set();
    channelMembers.set(channel, members);
  }
  members.add(userName);
}

export function leaveChannel(channel: string, userName: string): void {
  const members = channelMembers.get(channel);
  if (members) {
    members.delete(userName);
  }
}

export function removeUserFromAllChannels(userName: string): void {
  for (const members of channelMembers.values()) {
    members.delete(userName);
  }
}

export function getChannelMembers(channel: string): string[] {
  const members = channelMembers.get(channel);
  return members ? Array.from(members) : [];
}

export function getUserChannels(userName: string): string[] {
  const result: string[] = [];
  for (const [channel, members] of channelMembers) {
    if (members.has(userName)) {
      result.push(channel);
    }
  }
  return result;
}

export function isChannelMember(channel: string, userName: string): boolean {
  const members = channelMembers.get(channel);
  return members ? members.has(userName) : false;
}

export function getChannelMemberCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [channel, members] of channelMembers) {
    counts.set(channel, members.size);
  }
  return counts;
}

export function ensureChannelMembership(channel: string): void {
  if (!channelMembers.has(channel)) {
    channelMembers.set(channel, new Set());
  }
}

export function removeChannel(channel: string): void {
  channelMembers.delete(channel);
}
