import { defineConfig } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "url";
import { nitro } from "nitro/vite";

const config = defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: { options: { typeAware: true, typeCheck: true } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/_setup/setup.ts"],
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".output", "dist"],
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@test": fileURLToPath(new URL("./src/__tests__/_setup", import.meta.url)),
    },
  },
  plugins: [
    devtools(),
    nitro({
      // Use cloudflare-pages preset for production deployment
      // Change to 'node-server' for local development if needed
      preset: process.env.CF_PAGES ? "cloudflare-pages" : "node-server",
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;
