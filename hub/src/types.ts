import type { IncomingMessage, ServerResponse } from "node:http";

export interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
}

export interface User {
  name: string;
  token: string;
  registeredAt: number;
}

export interface RegisterRequest {
  name: string;
}

export interface RegisterResponse {
  token: string;
  name: string;
}

export interface SendRequest {
  to: string;
  content: string;
}

export interface SendResponse {
  id: string;
  to: string;
}

export interface PollResponse {
  messages: Message[];
}

export interface UsersResponse {
  users: string[];
}

export interface ErrorResponse {
  error: string;
}

export type PendingPoll = {
  userName: string;
  res: ServerResponse;
  timer: ReturnType<typeof setTimeout>;
};

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  userName?: string,
) => Promise<void>;
