import { defineConfig } from "vitest/config";
import viteReact from "@vitejs/plugin-react";

/**
 * Vitest config, deliberately separate from vite.config.ts: that file loads
 * @cloudflare/vite-plugin, which sets `resolve.external` for the SSR
 * environment and breaks Vitest's module resolution.
 */
export default defineConfig({
  plugins: [viteReact()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/_setup/setup.ts"],
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".output", "dist"],
    css: false,
  },
});
