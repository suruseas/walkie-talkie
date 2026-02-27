import http from "node:http";
import https from "node:https";

interface RequestOptions {
  method: string;
  path: string;
  token?: string;
  body?: unknown;
  timeoutMs?: number;
}

interface HubResponse<T = unknown> {
  status: number;
  data: T;
}

export class HubClient {
  private baseUrl: URL;

  constructor(hubUrl: string) {
    this.baseUrl = new URL(hubUrl);
  }

  private request<T>(options: RequestOptions): Promise<HubResponse<T>> {
    return new Promise((resolve, reject) => {
      const isHttps = this.baseUrl.protocol === "https:";
      const transport = isHttps ? https : http;

      const headers: Record<string, string> = {};
      if (options.token) {
        headers["Authorization"] = `Bearer ${options.token}`;
      }

      let bodyStr: string | undefined;
      if (options.body !== undefined) {
        bodyStr = JSON.stringify(options.body);
        headers["Content-Type"] = "application/json";
        headers["Content-Length"] = Buffer.byteLength(bodyStr).toString();
      }

      const req = transport.request(
        {
          hostname: this.baseUrl.hostname,
          port: this.baseUrl.port,
          path: options.path,
          method: options.method,
          headers,
          timeout: options.timeoutMs ?? 10_000,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => {
            const raw = Buffer.concat(chunks).toString();
            const status = res.statusCode ?? 0;
            if (status === 204 || raw.length === 0) {
              resolve({ status, data: {} as T });
              return;
            }
            try {
              resolve({ status, data: JSON.parse(raw) as T });
            } catch {
              reject(new Error(`Invalid JSON response: ${raw}`));
            }
          });
        },
      );

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timed out"));
      });

      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  async register(name: string, joinToken: string): Promise<{ token: string; name: string }> {
    const res = await this.request<{ token: string; name: string }>({
      method: "POST",
      path: "/register",
      token: joinToken,
      body: { name },
    });
    if (res.status !== 200) {
      throw new Error((res.data as { error?: string }).error ?? "Registration failed");
    }
    return res.data;
  }

  async unregister(token: string): Promise<void> {
    await this.request({
      method: "POST",
      path: "/unregister",
      token,
    });
  }

  async send(
    token: string,
    to: string,
    content: string,
  ): Promise<{ id: string; to: string }> {
    const res = await this.request<{ id: string; to: string }>({
      method: "POST",
      path: "/send",
      token,
      body: { to, content },
    });
    if (res.status !== 200) {
      throw new Error((res.data as { error?: string }).error ?? "Send failed");
    }
    return res.data;
  }

  async poll(
    token: string,
  ): Promise<{ messages: Array<{ id: string; from: string; to: string; content: string; timestamp: number }> } | null> {
    const res = await this.request<{
      messages: Array<{ id: string; from: string; to: string; content: string; timestamp: number }>;
    }>({
      method: "GET",
      path: "/poll",
      token,
      timeoutMs: 3_660_000, // 1 hour + 60s margin
    });
    if (res.status === 204) return null;
    if (res.status !== 200) {
      throw new Error((res.data as { error?: string }).error ?? "Poll failed");
    }
    return res.data;
  }

  async users(token: string): Promise<string[]> {
    const res = await this.request<{ users: string[] }>({
      method: "GET",
      path: "/users",
      token,
    });
    if (res.status !== 200) {
      throw new Error((res.data as { error?: string }).error ?? "Failed to get users");
    }
    return res.data.users;
  }
}
