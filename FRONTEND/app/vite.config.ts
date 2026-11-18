import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev: the browser talks to http://localhost:5173 only. /api is forwarded to the
// Spring app, so cookies behave like production (same origin).
// The API checks the Origin header on cookie requests, so add
// http://localhost:5173 to CORS_ALLOWED_ORIGINS in the local profile.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // <-- ADDED: Allows the tunnel to reach the server
    port: 5173,
    allowedHosts: [ // <-- ADDED: Fixes the "Blocked request" error
      "campuswari.xyz",
      "www.campuswari.xyz",
      ".campuswari.xyz"
    ],
    hmr: { // <-- ADDED: Fixes live-reloading through the tunnel
      protocol: "wss",
      clientPort: 443,
    },
    proxy: {
      "/api": { target: "http://localhost:8080", changeOrigin: false },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
