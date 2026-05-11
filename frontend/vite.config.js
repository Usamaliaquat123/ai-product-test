import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy /api -> http://localhost:3001 so the frontend can call the backend
// in development without worrying about CORS or hardcoded URLs.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
