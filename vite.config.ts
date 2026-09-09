import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    target: "es2022",
    cssTarget: "chrome111",
    assetsInlineLimit: 2048,
    reportCompressedSize: false,
  },
});
