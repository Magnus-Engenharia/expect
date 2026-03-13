import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import WebSocket from "ws";
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
  console.log(`Using: ${target.browser.name} - ${target.displayName}\n`);

  const tempDir = mkdtempSync(path.join(tmpdir(), "debug-cookies-"));
  const profileCopy = path.join(tempDir, "profile");
  copyDir(target.profilePath, profileCopy);

  for (const lock of ["SingletonLock", "SingletonSocket", "SingletonCookie"]) {
    const p = path.join(profileCopy, lock);
    if (existsSync(p)) unlinkSync(p);
  }

  const port = 9334;
  const proc = spawn(target.browser.executablePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileCopy}`,
    ...HEADLESS_CHROME_ARGS,
  ], { stdio: "pipe" });
  proc.stderr?.on("data", () => {});
  proc.unref();

  await sleep(3000);

  const targetsResp = await fetch(`http://localhost:${port}/json`);
  const targets = await targetsResp.json() as Array<Record<string, string>>;
  const pageTarget = targets.find((t) => t["type"] === "page");
  console.log("Page target:", pageTarget?.["title"], pageTarget?.["url"]);
  const wsUrl = pageTarget?.["webSocketDebuggerUrl"];

  if (!wsUrl) {
    console.log("No page target with wsUrl found");
    proc.kill();
    return;
  }

  console.log(`Connecting to: ${wsUrl}\n`);

  const socket = new WebSocket(wsUrl);

  socket.on("open", () => {
    console.log("Sending Network.getAllCookies...");
    socket.send(JSON.stringify({ id: 1, method: "Network.getAllCookies" }));
  });

  socket.on("message", (data: WebSocket.Data) => {
    const parsed = JSON.parse(data.toString());
    const cookieCount = parsed?.result?.cookies?.length ?? 0;
    console.log(`Response id=${parsed.id}, error=${JSON.stringify(parsed.error)}, cookies=${cookieCount}`);
    if (cookieCount > 0) {
      const cookies = parsed.result.cookies;
      const domains = new Set(cookies.map((c: { domain: string }) => c.domain));
      console.log(`\n${cookieCount} cookies from ${domains.size} domains`);
      for (const c of cookies.slice(0, 5)) {
        console.log(`  ${c.name}=${c.value?.slice(0, 30)}... (${c.domain})`);
      }
    }
    socket.close();
    proc.kill();
    rmSync(tempDir, { recursive: true, force: true });
  });

  socket.on("error", (err: Error) => {
    console.log("WS error:", err.message);
    proc.kill();
  });
};

main().catch(console.error);
