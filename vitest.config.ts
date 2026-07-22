import { defineConfig } from "vitest/config";

/**
 * A standalone Vitest config so the unit tests don't load the app's Cloudflare
 * Vite plugin (which needs a Workers context). The Grove verifier uses only Web
 * Crypto + standard JS, so the default Node environment runs it as-is.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
