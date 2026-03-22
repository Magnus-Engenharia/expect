import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/models.ts", "src/agent.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
  },
});
