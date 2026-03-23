import { createRequire } from "node:module";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LIVE_VIEW_PORT_RANGE_START = 17400;
const LIVE_VIEW_PORT_RANGE_SIZE = 600;
const SERVER_GLOBAL_KEY = "__browserTesterLiveViewServer";

const liveViewPort =
  LIVE_VIEW_PORT_RANGE_START + Math.floor(Math.random() * LIVE_VIEW_PORT_RANGE_SIZE);

export const LIVE_VIEW_URL = `http://127.0.0.1:${liveViewPort}`;

const LOADING_HTML =
  '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="1"><style>:root{color-scheme:dark}body{margin:0;font-family:system-ui,sans-serif;background:#0f172a;color:#94a3b8;display:flex;align-items:center;justify-content:center;height:100vh}</style></head><body><p>Loading viewer\u2026</p></body></html>';

const NO_CACHE = { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } as const;

const findViewerRoot = (): string | undefined => {
  try {
    const require = createRequire(import.meta.url);
    const packagePath = dirname(require.resolve("@browser-tester/videogen/package.json"));
    const viewerPath = join(packagePath, "viewer");
    if (existsSync(join(viewerPath, "index.html"))) return viewerPath;
  } catch {}

  const thisDir = dirname(fileURLToPath(import.meta.url));
  const devPath = join(thisDir, "..", "..", "..", "packages", "videogen", "viewer");
  if (existsSync(join(devPath, "index.html"))) return devPath;

  return undefined;
};

type Handler = (request: IncomingMessage, response: ServerResponse) => void;
let viteHandler: Handler | undefined;

const handleRequest: Handler = (request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;

  if (pathname === "/latest.json") {
    response.writeHead(200, { "Content-Type": "application/json", ...NO_CACHE });
    response.end("[]");
    return;
  }

  if (pathname === "/steps") {
    response.writeHead(200, { "Content-Type": "application/json", ...NO_CACHE });
    response.end('{"title":"","status":"running","steps":[],"summary":null}');
    return;
  }

  if (pathname === "/events") {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      ...NO_CACHE,
    });
    response.flushHeaders();
    return;
  }

  if (viteHandler) {
    viteHandler(request, response);
    return;
  }

  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...NO_CACHE });
  response.end(LOADING_HTML);
};

const server = createServer(handleRequest);
server.listen(liveViewPort, "127.0.0.1");
(globalThis as Record<string, unknown>)[SERVER_GLOBAL_KEY] = server;

const viewerRoot = findViewerRoot();
if (viewerRoot) {
  import("vite")
    .then(async (vite) => {
      const devServer = await vite.createServer({
        root: viewerRoot,
        server: { middlewareMode: true },
        logLevel: "silent",
        define: { __LIVE_VIEW__: "true" },
      });
      const middleware = (request: IncomingMessage, response: ServerResponse, next: () => void) =>
        devServer.middlewares(request, response, next);
      viteHandler = (request, response) =>
        middleware(request, response, () => {
          response.writeHead(404);
          response.end("Not found");
        });
      (globalThis as Record<string, unknown>)["__browserTesterViteServer"] = devServer;
      (globalThis as Record<string, unknown>)["__browserTesterViteHandler"] = middleware;
    })
    .catch(() => {});
}
