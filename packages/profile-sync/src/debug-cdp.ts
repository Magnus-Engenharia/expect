import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { detectBrowserProfiles } from "./browser/detector.js";
import { HEADLESS_CHROME_ARGS } from "./constants.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const copyDir = (src: string, dst: string): void => {
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src)) {
    try {
      const s = path.join(src, entry);
      const d = path.join(dst, entry);
      if (statSync(s).isDirectory()) copyDir(s, d);
      else copyFileSync(s, d);
    } catch {}
  }
};

const main = async () => {
  const profiles = detectBrowserProfiles();
  const target = profiles[0]!;
  console.log(`Using: ${target.browser.name} - ${target.displayName}`);

  const tempDir = mkdtempSync(path.join(tmpdir(), "debug-cdp-"));
  const profileCopy = path.join(tempDir, "profile");
  copyDir(target.profilePath, profileCopy);

  for (const lock of ["SingletonLock", "SingletonSocket", "SingletonCookie"]) {
    const lockPath = path.join(profileCopy, lock);
    if (existsSync(lockPath)) unlinkSync(lockPath);
  }

  const port = 9333;
  const args = [`--remote-debugging-port=${port}`, `--user-data-dir=${profileCopy}`, ...HEADLESS_CHROME_ARGS];
  console.log(`Launching: ${target.browser.executablePath} ${args.join(" ")}`);

  const proc = spawn(target.browser.executablePath, args, { stdio: "pipe" });
  proc.stderr?.on("data", (chunk: Buffer) => process.stderr.write(chunk));
  proc.unref();

  await sleep(3000);

  console.log("\n--- /json/version ---");
  try {
    const versionResponse = await fetch(`http://localhost:${port}/json/version`);
    console.log(await versionResponse.text());
  } catch (error) {
    console.log("Failed:", error);
  }

  console.log("\n--- /json (targets) ---");
  try {
    const targetsResponse = await fetch(`http://localhost:${port}/json`);
    const targets = await targetsResponse.json();
    console.log(JSON.stringify(targets, null, 2));
  } catch (error) {
    console.log("Failed:", error);
  }

  proc.kill();
  rmSync(tempDir, { recursive: true, force: true });
};

main().catch(console.error);
