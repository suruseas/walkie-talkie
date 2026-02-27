#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./tools.js";

const args = process.argv.slice(2);
let hubUrl = process.env.HUB_URL || "http://localhost:9559";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--hub" && args[i + 1]) {
    hubUrl = args[i + 1];
    i++;
  }
}

const joinToken = process.env.WALKIE_TALKIE_JOIN_TOKEN;
if (!joinToken) {
  console.error("Error: WALKIE_TALKIE_JOIN_TOKEN environment variable is required");
  process.exit(1);
}

const server = createMcpServer(hubUrl, joinToken);
const transport = new StdioServerTransport();
await server.connect(transport);
