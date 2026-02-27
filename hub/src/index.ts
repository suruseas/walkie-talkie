import { randomBytes } from "node:crypto";
import { createHubServer } from "./server.js";

const port = parseInt(process.env.PORT ?? "9559", 10);

const joinToken = process.env.WALKIE_TALKIE_JOIN_TOKEN;
if (!joinToken) {
  console.error("Error: WALKIE_TALKIE_JOIN_TOKEN environment variable is required");
  process.exit(1);
}

const adminToken = randomBytes(24).toString("base64url");

createHubServer(port, adminToken, joinToken);
