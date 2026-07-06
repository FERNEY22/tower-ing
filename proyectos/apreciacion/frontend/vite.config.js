import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En dev, /api se redirige al backend FastAPI local (:8000).
// En build de produccion se usa VITE_API_URL (la URL de Render).
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
