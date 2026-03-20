import { build } from "esbuild";
import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";

const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");

const result = await build({
  entryPoints: [path.resolve(root, "src/runtime/index.ts")],
  bundle: true,
  format: "iife",
  globalName: "__replayRuntime",
  minify: true,
  write: false,
  platform: "browser",
});

const bundledCode = result.outputFiles[0].text.trimEnd();
const escaped = JSON.stringify(bundledCode);
const generatedDir = path.resolve(root, "src/generated");

fs.mkdirSync(generatedDir, { recursive: true });
fs.writeFileSync(
  path.resolve(root, "src/generated/runtime-script.ts"),
  `export const RUNTIME_SCRIPT = ${escaped};\n`,
);
