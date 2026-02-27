import { build } from "esbuild";
import { chmod } from "node:fs/promises";

const outfile = "plugin/dist/mcp-server.mjs";

await build({
  entryPoints: ["mcp-server/src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  outfile,
  external: ["node:*"],
});

await chmod(outfile, 0o755);

console.log(`Bundled → ${outfile}`);
