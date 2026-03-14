import { defineConfig } from "tsup";
import { reactCompilerPlugin } from "./esbuild-react-compiler-plugin";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  banner: { js: "#!/usr/bin/env node" },
  noExternal: [/^@browser-tester\//],
  esbuildPlugins: [reactCompilerPlugin()],
  esbuildOptions(options) {
    options.logOverride = { ...options.logOverride, "empty-import-meta": "silent" };
    options.inject = [...(options.inject ?? []), "./ink-grab/inject-hook.js"];
  },
});
