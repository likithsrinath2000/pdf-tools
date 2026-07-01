import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  test: {
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    environmentMatchGlobs: [
      ["client/**", "jsdom"],
      ["server/**", "node"],
      ["shared/**", "node"],
    ],
    include: [
      "server/**/*.{test,spec}.{ts,tsx}",
      "client/src/**/*.{test,spec}.{ts,tsx}",
      "shared/**/*.{test,spec}.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text", "html"],
      include: [
        "server/**/*.ts",
        "client/src/**/*.{ts,tsx}",
        "shared/**/*.ts",
      ],
      exclude: [
        // Vendored shadcn/ui primitives (generated boilerplate)
        "client/src/components/ui/**",
        // App bootstrap / dev-only plumbing (not unit-testable)
        "client/src/main.tsx",
        "client/src/App.tsx",
        "server/index.ts",
        "server/vite.ts",
        "server/static.ts",
        "server/db.ts",
        // Type-only and config
        "**/*.d.ts",
        "**/*.config.*",
        "client/src/vite-env.d.ts",
        // Test files themselves
        "**/*.{test,spec}.{ts,tsx}",
        "**/__tests__/**",
        "**/__mocks__/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
