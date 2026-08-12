import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

/**
 * Build/dev config only. Test config lives in vitest.config.ts, deliberately
 * separate: @cloudflare/vite-plugin sets `resolve.external` for the SSR
 * environment and breaks Vitest's module resolution. Keeping them apart is
 * cleaner than the `isTest` guard this file used to carry.
 *
 * `resolve.tsconfigPaths` is Vite 8's native replacement for vite-plus's
 * option of the same name; it reads the `@/*` and `@test/*` aliases straight
 * from tsconfig.json, so no path-alias plugin is needed.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});
