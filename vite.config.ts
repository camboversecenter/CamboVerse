import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

// Vite + React app served by a Cloudflare Worker.
// The `cloudflare()` plugin runs the app against the real workerd runtime in
// `vite dev`/`vite preview`, and produces a Worker bundle on `vite build`.
export default defineConfig({
  plugins: [react(), cloudflare()],
});
