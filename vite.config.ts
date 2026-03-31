import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const backendTarget = "https://planering-backend.onrender.com";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
