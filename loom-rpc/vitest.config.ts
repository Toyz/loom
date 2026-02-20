import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      // Point @toyz/loom imports to the source in the parent monorepo
      "@toyz/loom/store": resolve(__dirname, "../src/store/index.ts"),
      "@toyz/loom/decorators": resolve(__dirname, "../src/decorators/index.ts"),
      "@toyz/loom": resolve(__dirname, "../src/index.ts"),
      // Point @toyz/loom-rpc to our own source
      "@toyz/loom-rpc/testing": resolve(__dirname, "src/testing.ts"),
      "@toyz/loom-rpc": resolve(__dirname, "src/index.ts"),
    },
  },
});
