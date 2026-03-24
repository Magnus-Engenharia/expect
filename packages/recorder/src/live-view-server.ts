import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Effect } from "effect";

const VIEWER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../viewer");

export interface LiveViewHandle {
  readonly url: string;
  readonly close: Effect.Effect<void>;
}

export const startLiveViewServer = Effect.fn("LiveViewServer.start")(function* (
  liveViewUrl: string,
) {
  const parsedUrl = new URL(liveViewUrl);

  const { createServer: createViteServer } = yield* Effect.tryPromise({
    try: () => import("vite"),
    catch: (cause) => new Error(`Failed to load vite: ${cause}`),
  });

  const viteServer = yield* Effect.tryPromise({
    try: () =>
      createViteServer({
        root: VIEWER_ROOT,
        server: {
          host: parsedUrl.hostname,
          port: Number(parsedUrl.port),
          strictPort: true,
        },
        logLevel: "silent",
      }),
    catch: (cause) => new Error(`Failed to create Vite server: ${cause}`),
  });

  yield* Effect.tryPromise({
    try: () => viteServer.listen(),
    catch: (cause) => new Error(`Failed to start Vite server: ${cause}`),
  });

  return {
    url: parsedUrl.toString(),
    close: Effect.tryPromise({
      try: () => viteServer.close(),
      catch: () => new Error("Failed to close Vite server"),
    }),
  } satisfies LiveViewHandle;
});
