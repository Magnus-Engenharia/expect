import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { EXPECT_STATE_DIR } from "../src/constants";

const CONTENT_TYPES: Record<string, string> = {
  ".json": "application/json",
  ".ndjson": "application/x-ndjson",
};

const testieServePlugin = (): Plugin => ({
  name: "testie-serve",
  configureServer(server) {
    const testieDir = resolve(process.cwd(), EXPECT_STATE_DIR);
    server.middlewares.use((request, response, next) => {
      const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
      const prefix = `/${EXPECT_STATE_DIR}/`;
      if (!pathname.startsWith(prefix)) return next();

      const relativePath = pathname.slice(prefix.length);
      const filePath = resolve(testieDir, relativePath);
      if (!filePath.startsWith(testieDir)) return next();

      try {
        const content = readFileSync(filePath);
        const extension = relativePath.slice(relativePath.lastIndexOf("."));
        response.writeHead(200, {
          "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
          "Cache-Control": "no-store",
        });
        response.end(content);
      } catch {
        response.writeHead(404);
        response.end();
      }
    });
  },
});

export default defineConfig({
  plugins: [testieServePlugin(), tailwindcss(), react()],
  resolve: {
    alias: {
      "@": resolve(dirname(fileURLToPath(import.meta.url)), "src"),
    },
  },
});
