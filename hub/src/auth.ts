import { randomBytes } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { User } from "./types.js";

const users = new Map<string, User>();
const tokenToName = new Map<string, string>();

export function registerUser(name: string): User {
  if (users.has(name)) {
    throw new Error(`User "${name}" is already registered`);
  }
  const token = randomBytes(32).toString("hex");
  const user: User = { name, token, registeredAt: Date.now() };
  users.set(name, user);
  tokenToName.set(token, name);
  return user;
}

export function unregisterUser(name: string): void {
  const user = users.get(name);
  if (user) {
    tokenToName.delete(user.token);
    users.delete(name);
  }
}

export function authenticateRequest(req: IncomingMessage): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  return tokenToName.get(token) ?? null;
}

export function getRegisteredUsers(): string[] {
  return Array.from(users.keys());
}

export function isUserRegistered(name: string): boolean {
  return users.has(name);
}
