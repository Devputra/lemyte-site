// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    // Placeholders so server modules can be imported; unit tests never reach a real database.
    env: { SUPABASE_URL: "http://localhost:54321", SUPABASE_SERVICE_ROLE_KEY: "test-key" },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/test/server-only-stub.ts"),
    },
  },
});
