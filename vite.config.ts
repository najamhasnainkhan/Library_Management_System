import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
    proxy: { "/api": `http://localhost:${process.env.API_PORT || 3001}` },
  },
});
