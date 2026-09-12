import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    {
      name: "agent-context",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const path = req.url?.split("?")[0];
          if (!path || !["/profile.json", "/agents.md", "/llms.txt"].includes(path)) return next();
          try {
            const { machineFiles } = await server.ssrLoadModule("/src/content/agents.ts");
            const file = machineFiles()[path];
            res.setHeader("Content-Type", file.type);
            res.end(req.method === "HEAD" ? undefined : file.body);
          } catch (error) {
            next(error);
          }
        });
      },
    },
  ],
  build: {
    target: "es2022",
    cssTarget: "chrome111",
    assetsInlineLimit: 2048,
    reportCompressedSize: false,
  },
});
