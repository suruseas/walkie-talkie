import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "forks",
    fileParallelism: false,
    include: ["src/__tests__/**/*.test.ts"],
  },
});
