import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HubClient } from "./client.js";

let client: HubClient;
let joinToken: string;
let currentToken: string | null = null;
let currentName: string | null = null;

export function createMcpServer(hubUrl: string, joinTok: string): McpServer {
  client = new HubClient(hubUrl);
  joinToken = joinTok;

  const server = new McpServer({
    name: "walkie-talkie",
    version: "1.0.0",
  });

  server.tool(
    "radio_join",
    "Join the Walkie-Talkie hub with a display name. You must join before using other radio tools.",
    { name: z.string().describe("Your display name for this session") },
    async ({ name }) => {
      if (currentToken) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Already registered as "${currentName}". Unregister first to change name.`,
            },
          ],
        };
      }
      try {
        const result = await client.register(name, joinToken);
        currentToken = result.token;
        currentName = result.name;
        return {
          content: [
            {
              type: "text" as const,
              text: `Registered as "${currentName}". You are now in #all. You can now send and receive messages.`,
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            { type: "text" as const, text: `Registration failed: ${(e as Error).message}` },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "radio_over",
    "Send a message to another user. Use @name format for the recipient, or @all to broadcast. Messages are scoped to a channel.",
    {
      to: z.string().describe("Recipient: @name or @all"),
      message: z.string().describe("Message content"),
      channel: z.string().optional().describe("Channel to send to (default: #all)"),
    },
    async ({ to, message, channel }) => {
      if (!currentToken) {
        return {
          content: [
            { type: "text" as const, text: "Not on the air. Use radio_join first." },
          ],
          isError: true,
        };
      }
      try {
        const result = await client.send(currentToken, to, message, channel);
        return {
          content: [
            {
              type: "text" as const,
              text: `Message sent to ${result.to} in ${channel || "#all"} (id: ${result.id})`,
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            { type: "text" as const, text: `Send failed: ${(e as Error).message}` },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "radio_standby",
    "Stand by for incoming messages using long polling. Blocks up to 30 seconds. Returns received messages or empty if timeout.",
    {},
    async () => {
      if (!currentToken) {
        return {
          content: [
            { type: "text" as const, text: "Not on the air. Use radio_join first." },
          ],
          isError: true,
        };
      }
      try {
        const result = await client.poll(currentToken);
        if (!result || result.messages.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "No new messages (poll timed out). Try again." },
            ],
          };
        }
        // Check for kill signal from operator
        const killed = result.messages.find((m) => m.content.startsWith("RADIO_KILLED:"));
        if (killed) {
          currentToken = null;
          currentName = null;
          return {
            content: [
              { type: "text" as const, text: "RADIO_KILLED: You have been disconnected by the operator. Do NOT call any more radio tools. Stop immediately." },
            ],
            isError: true,
          };
        }
        const formatted = result.messages
          .map((m) => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.channel || "#all"} ${m.from} → ${m.to}: ${m.content}`)
          .join("\n");
        return {
          content: [{ type: "text" as const, text: formatted }],
        };
      } catch (e) {
        const msg = (e as Error).message;
        if (msg === "Unauthorized") {
          currentToken = null;
          currentName = null;
          return {
            content: [
              { type: "text" as const, text: "RADIO_KILLED: You have been disconnected by the operator. Do NOT call any more radio tools. Stop immediately." },
            ],
            isError: true,
          };
        }
        return {
          content: [
            { type: "text" as const, text: `Poll failed: ${msg}` },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "radio_channels",
    "List all currently connected users on the hub and available channels.",
    {},
    async () => {
      if (!currentToken) {
        return {
          content: [
            { type: "text" as const, text: "Not on the air. Use radio_join first." },
          ],
          isError: true,
        };
      }
      try {
        const [users, channels] = await Promise.all([
          client.users(currentToken),
          client.listChannels(currentToken),
        ]);
        const userText = users.length > 0
          ? `Connected users: ${users.join(", ")}`
          : "No users connected.";
        const channelText = channels.length > 0
          ? `Channels: ${channels.map((c) => `${c.name} (${c.memberCount} members)`).join(", ")}`
          : "No channels.";
        return {
          content: [
            {
              type: "text" as const,
              text: `${userText}\n${channelText}`,
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            { type: "text" as const, text: `Failed: ${(e as Error).message}` },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "radio_channel_create",
    "Create a new channel on the hub. You will automatically join the channel.",
    { name: z.string().describe("Channel name (with or without # prefix)") },
    async ({ name }) => {
      if (!currentToken) {
        return {
          content: [
            { type: "text" as const, text: "Not on the air. Use radio_join first." },
          ],
          isError: true,
        };
      }
      try {
        const result = await client.createChannel(currentToken, name);
        return {
          content: [
            {
              type: "text" as const,
              text: `Channel ${result.channel} created. You have been auto-joined.`,
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            { type: "text" as const, text: `Failed to create channel: ${(e as Error).message}` },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "radio_channel_join",
    "Join an existing channel to send and receive messages in it.",
    { channel: z.string().describe("Channel name to join (e.g. #my-channel)") },
    async ({ channel }) => {
      if (!currentToken) {
        return {
          content: [
            { type: "text" as const, text: "Not on the air. Use radio_join first." },
          ],
          isError: true,
        };
      }
      try {
        await client.joinChannel(currentToken, channel);
        return {
          content: [
            {
              type: "text" as const,
              text: `Joined ${channel}.`,
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            { type: "text" as const, text: `Failed to join channel: ${(e as Error).message}` },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "radio_channel_leave",
    "Leave a channel. You cannot leave #all.",
    { channel: z.string().describe("Channel name to leave") },
    async ({ channel }) => {
      if (!currentToken) {
        return {
          content: [
            { type: "text" as const, text: "Not on the air. Use radio_join first." },
          ],
          isError: true,
        };
      }
      try {
        await client.leaveChannel(currentToken, channel);
        return {
          content: [
            {
              type: "text" as const,
              text: `Left ${channel}.`,
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            { type: "text" as const, text: `Failed to leave channel: ${(e as Error).message}` },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "radio_channel_invite",
    "Invite another user to a channel. The user is automatically joined and notified via their next poll.",
    {
      channel: z.string().describe("Channel name to invite the user to"),
      user: z.string().describe("User to invite (e.g. @agent-name)"),
    },
    async ({ channel, user }) => {
      if (!currentToken) {
        return {
          content: [
            { type: "text" as const, text: "Not on the air. Use radio_join first." },
          ],
          isError: true,
        };
      }
      try {
        await client.inviteToChannel(currentToken, channel, user);
        return {
          content: [
            {
              type: "text" as const,
              text: `Invited ${user} to ${channel}.`,
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            { type: "text" as const, text: `Failed to invite: ${(e as Error).message}` },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "radio_out",
    "Sign off and disconnect from the Walkie-Talkie hub. Over and out.",
    {},
    async () => {
      if (!currentToken) {
        return {
          content: [
            { type: "text" as const, text: "Not registered." },
          ],
        };
      }
      try {
        await client.unregister(currentToken);
        const name = currentName;
        currentToken = null;
        currentName = null;
        return {
          content: [
            { type: "text" as const, text: `Unregistered "${name}". Disconnected from hub.` },
          ],
        };
      } catch (e) {
        return {
          content: [
            { type: "text" as const, text: `Unregister failed: ${(e as Error).message}` },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}
