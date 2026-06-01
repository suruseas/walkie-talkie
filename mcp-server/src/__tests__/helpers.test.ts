import { describe, expect, it } from "vitest";
import { formatConnectedUsers, resolveWaitScript } from "../helpers.js";

describe("resolveWaitScript", () => {
  // radio-wait.sh physically lives only at <repo>/plugin/bin/radio-wait.sh.
  const REAL = "/repo/plugin/bin/radio-wait.sh";
  const existsOnlyPluginBin = (p: string) => p === REAL;

  it("resolves the real plugin/bin path when running from the mcp-server/dist build", () => {
    // Regression: the old single-candidate `../bin` logic returned
    // /repo/mcp-server/bin/radio-wait.sh here, which does not exist.
    const result = resolveWaitScript("/repo/mcp-server/dist", existsOnlyPluginBin);
    expect(result).toBe(REAL);
    expect(result).not.toBe("/repo/mcp-server/bin/radio-wait.sh");
  });

  it("resolves the real plugin/bin path when running from the bundled plugin/dist entry", () => {
    const result = resolveWaitScript("/repo/plugin/dist", existsOnlyPluginBin);
    expect(result).toBe(REAL);
  });

  it("never returns a path the predicate rejects when a candidate exists", () => {
    const result = resolveWaitScript("/repo/mcp-server/dist", existsOnlyPluginBin);
    expect(existsOnlyPluginBin(result)).toBe(true);
  });

  it("falls back to the first candidate when no candidate exists on disk", () => {
    const result = resolveWaitScript("/repo/mcp-server/dist", () => false);
    expect(result).toBe("/repo/mcp-server/bin/radio-wait.sh");
  });
});

describe("formatConnectedUsers", () => {
  it("renders user names from the hub's object array", () => {
    const out = formatConnectedUsers([
      { name: "skills", online: true },
      { name: "dora", online: true },
    ]);
    expect(out).toBe("Connected users: skills, dora");
  });

  it("never renders [object Object] for object input (regression)", () => {
    const out = formatConnectedUsers([
      { name: "skills", online: true },
      { name: "dora", online: true },
    ]);
    expect(out).not.toContain("[object Object]");
  });

  it("marks offline users so stale registrations are visible", () => {
    const out = formatConnectedUsers([
      { name: "skills", online: true },
      { name: "dora", online: false },
    ]);
    expect(out).toBe("Connected users: skills, dora (offline)");
  });

  it("reports the empty case", () => {
    expect(formatConnectedUsers([])).toBe("No users connected.");
  });
});
