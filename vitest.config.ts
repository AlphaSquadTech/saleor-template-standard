import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      include: ["core/src/lib/checkout/helpers.ts", "core/src/lib/checkout/fulfillment.ts"],
      exclude: ["core/src/lib/checkout/operations.ts", "core/src/lib/checkout/service.ts", "core/src/lib/checkout/types.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "core/src"),
      "@core": path.resolve(__dirname, "core/src"),
    },
  },
});
