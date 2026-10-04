import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // permite abrir desde el celular en la misma red WiFi
    proxy: {
      // En desarrollo, redirige las llamadas /api al backend en el puerto 3001
      "/api": "http://localhost:3001",
    },
  },
});
