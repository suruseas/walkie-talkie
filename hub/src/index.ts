import { randomBytes } from "node:crypto";
import { createHubServer } from "./server.js";
import { initDB } from "./db.js";
import { initGeneralChannel } from "./channels.js";

const port = parseInt(process.env.PORT ?? "9559", 10);

const joinToken = process.env.WALKIE_TALKIE_JOIN_TOKEN;
if (!joinToken) {
  console.error("Error: WALKIE_TALKIE_JOIN_TOKEN environment variable is required");
  process.exit(1);
}

const adminToken =
  process.env.WALKIE_TALKIE_ADMIN_TOKEN || randomBytes(24).toString("base64url");
console.log(
  `Admin token: ${process.env.WALKIE_TALKIE_ADMIN_TOKEN ? "from env" : "generated"}`
);

initDB();
initGeneralChannel();

createHubServer(port, adminToken, joinToken);
