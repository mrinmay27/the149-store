import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 8080,
    host: "127.0.0.1"
  },
  define: {
    __WB_TOKEN__: JSON.stringify(process.env.WB_TOKEN || ""),
  },
});
