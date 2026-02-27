import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  registerUser,
  unregisterUser,
  authenticateRequest,
  getRegisteredUsers,
  isUserRegistered,
} from "./auth.js";
import { routeMessage, ensureQueue, removeQueue } from "./router.js";
import { addPoll, removePoll } from "./polling.js";
import { addSSEClient, broadcast } from "./events.js";
import { getDashboardHTML } from "./dashboard.js";
import type {
  RegisterRequest,
  SendRequest,
  RouteHandler,
} from "./types.js";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function sendError(res: ServerResponse, status: number, message: string): void {
  sendJson(res, status, { error: message });
}

const handleRegister: RouteHandler = async (req, res) => {
  const body = JSON.parse(await readBody(req)) as RegisterRequest;
  if (!body.name || typeof body.name !== "string") {
    return sendError(res, 400, "Missing or invalid 'name' field");
  }
  try {
    const user = registerUser(body.name);
    ensureQueue(body.name);
    broadcast({ type: "join", name: body.name, timestamp: Date.now() });
    console.log(`[register] ${body.name}`);
    sendJson(res, 200, { token: user.token, name: user.name });
  } catch (e) {
    sendError(res, 409, (e as Error).message);
  }
};

const handleSend: RouteHandler = async (req, res, userName) => {
  const body = JSON.parse(await readBody(req)) as SendRequest;
  if (!body.to || !body.content) {
    return sendError(res, 400, "Missing 'to' or 'content' field");
  }
  try {
    const message = routeMessage(userName!, body.to, body.content);
    broadcast({ type: "message", from: message.from, to: message.to, content: message.content, timestamp: message.timestamp });
    console.log(`[send] ${userName} -> ${body.to}: ${body.content}`);
    sendJson(res, 200, { id: message.id, to: message.to });
  } catch (e) {
    sendError(res, 404, (e as Error).message);
  }
};

const handlePoll: RouteHandler = async (_req, res, userName) => {
  addPoll(userName!, res);
};

const handleUsers: RouteHandler = async (_req, res) => {
  sendJson(res, 200, { users: getRegisteredUsers() });
};

const handleUnregister: RouteHandler = async (_req, res, userName) => {
  removePoll(userName!);
  removeQueue(userName!);
  unregisterUser(userName!);
  broadcast({ type: "leave", name: userName!, timestamp: Date.now() });
  console.log(`[unregister] ${userName}`);
  sendJson(res, 200, { ok: true });
};

function kickUser(name: string): boolean {
  if (!getRegisteredUsers().includes(name)) return false;
  // Send a termination message before kicking, so the agent's pending poll receives it
  try {
    routeMessage("system", name, "RADIO_KILLED: You have been disconnected by the operator. Stop immediately.");
  } catch { /* ignore if routing fails */ }
  removePoll(name);
  removeQueue(name);
  unregisterUser(name);
  broadcast({ type: "leave", name, timestamp: Date.now() });
  console.log(`[kick] ${name}`);
  return true;
}

const handleKick: RouteHandler = async (req, res) => {
  const body = JSON.parse(await readBody(req)) as { name?: string };
  if (!body.name) {
    return sendError(res, 400, "Missing 'name' field");
  }
  if (kickUser(body.name)) {
    sendJson(res, 200, { ok: true, kicked: body.name });
  } else {
    sendError(res, 404, `User "${body.name}" not found`);
  }
};

const handleKickAll: RouteHandler = async (_req, res) => {
  const allUsers = [...getRegisteredUsers()];
  for (const name of allUsers) {
    kickUser(name);
  }
  sendJson(res, 200, { ok: true, kicked: allUsers });
};

const handleAdminSend: RouteHandler = async (req, res) => {
  const body = JSON.parse(await readBody(req)) as { from?: string; to?: string; content?: string };
  const from = body.from || "operator";
  if (!body.to || !body.content) {
    return sendError(res, 400, "Missing 'to' or 'content' field");
  }
  // Auto-register the admin sender so agents can reply
  if (!isUserRegistered(from)) {
    try {
      registerUser(from);
      ensureQueue(from);
      broadcast({ type: "join", name: from, timestamp: Date.now() });
      console.log(`[auto-register] ${from}`);
    } catch { /* already registered */ }
  }
  try {
    const message = routeMessage(from, body.to, body.content);
    broadcast({ type: "message", from: message.from, to: message.to, content: message.content, timestamp: message.timestamp });
    console.log(`[admin-send] ${from} -> ${body.to}: ${body.content}`);
    sendJson(res, 200, { id: message.id, to: message.to });
  } catch (e) {
    sendError(res, 404, (e as Error).message);
  }
};

const publicRoutes: Record<string, { method: string; handler: RouteHandler }> = {
  "/users": { method: "GET", handler: handleUsers },
};

const joinRoutes: Record<string, { method: string; handler: RouteHandler }> = {
  "/register": { method: "POST", handler: handleRegister },
};

const adminRoutes: Record<string, { method: string; handler: RouteHandler }> = {
  "/kick": { method: "POST", handler: handleKick },
  "/kick-all": { method: "POST", handler: handleKickAll },
  "/admin-send": { method: "POST", handler: handleAdminSend },
};

const protectedRoutes: Record<string, { method: string; handler: RouteHandler }> = {
  "/send": { method: "POST", handler: handleSend },
  "/poll": { method: "GET", handler: handlePoll },
  "/unregister": { method: "POST", handler: handleUnregister },
};

function authenticateBearer(req: IncomingMessage, expected: string): boolean {
  const auth = req.headers.authorization;
  if (!auth) return false;
  const [scheme, token] = auth.split(" ");
  return scheme === "Bearer" && token === expected;
}

export function createHubServer(port: number, adminToken: string, joinToken: string): void {
  function handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const path = url.pathname;

    // Dashboard & SSE
    if (path === "/" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(getDashboardHTML(adminToken));
      return;
    }
    if (path === "/events" && req.method === "GET") {
      addSSEClient(res);
      return;
    }

    // Public routes
    const publicRoute = publicRoutes[path];
    if (publicRoute) {
      if (req.method !== publicRoute.method) {
        sendError(res, 405, "Method not allowed");
        return;
      }
      publicRoute.handler(req, res).catch((e) => {
        sendError(res, 500, (e as Error).message);
      });
      return;
    }

    // Join routes (require join token)
    const joinRoute = joinRoutes[path];
    if (joinRoute) {
      if (req.method !== joinRoute.method) {
        sendError(res, 405, "Method not allowed");
        return;
      }
      if (!authenticateBearer(req, joinToken)) {
        sendError(res, 401, "Join token required");
        return;
      }
      joinRoute.handler(req, res).catch((e) => {
        sendError(res, 500, (e as Error).message);
      });
      return;
    }

    // Admin routes (require admin token)
    const adminRoute = adminRoutes[path];
    if (adminRoute) {
      if (req.method !== adminRoute.method) {
        sendError(res, 405, "Method not allowed");
        return;
      }
      if (!authenticateBearer(req, adminToken)) {
        sendError(res, 401, "Admin token required");
        return;
      }
      adminRoute.handler(req, res).catch((e) => {
        sendError(res, 500, (e as Error).message);
      });
      return;
    }

    // User-protected routes (require user token)
    const protectedRoute = protectedRoutes[path];
    if (protectedRoute) {
      if (req.method !== protectedRoute.method) {
        sendError(res, 405, "Method not allowed");
        return;
      }
      const userName = authenticateRequest(req);
      if (!userName) {
        sendError(res, 401, "Unauthorized");
        return;
      }
      protectedRoute.handler(req, res, userName).catch((e) => {
        sendError(res, 500, (e as Error).message);
      });
      return;
    }

    sendError(res, 404, "Not found");
  }

  const server = createServer(handleRequest);
  server.listen(port, "127.0.0.1", () => {
    console.log(`Walkie-Talkie Hub listening on http://localhost:${port}`);
  });
}
