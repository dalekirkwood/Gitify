import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// ponytail: Tauri wants a fixed dev port + no auto-clear so its CLI can attach
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  clearScreen: false,
  server: { port: 1420, strictPort: true },
});
