import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { eventWithTime } from "@rrweb/types";
import { Effect, Fiber, PubSub, Schema, Stream } from "effect";
import { ViewerRunState } from "./viewer-events";
import { buildViewerShell } from "./viewer-server";

const decodeRunState = Schema.decodeUnknownSync(ViewerRunState);

export interface LiveViewHandle {
  readonly url: string;
  readonly pushReplayEvents: (events: eventWithTime[]) => void;
  readonly pushRunState: (state: ViewerRunState) => void;
  readonly getLatestRunState: () => ViewerRunState | undefined;
  readonly complete: (reportHtml: string) => void;
  readonly close: Effect.Effect<void>;
}

export interface StartLiveViewServerOptions {
  readonly liveViewUrl: string;
}

type SseClient = ServerResponse<IncomingMessage>;

const NO_CACHE_HEADERS = { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } as const;

const listenServer = (server: Server, host: string, port: number) =>
  Effect.callback<void, Error>((resume) => {
    const onError = (error: Error) => resume(Effect.fail(error));
    server.once("error", onError);
    server.listen({ host, port }, () => {
      server.off("error", onError);
      resume(Effect.void);
    });
  });

const closeServer = (server: Server) =>
  Effect.callback<void>((resume) => {
    server.close(() => resume(Effect.void));
  });

export const startLiveViewServer = Effect.fn("LiveViewServer.start")(function* (
  options: StartLiveViewServerOptions,
) {
  const parsedUrl = new URL(options.liveViewUrl);
  const sseClients = new Set<SseClient>();
  const accumulatedReplayEvents: eventWithTime[] = [];
  let latestRunState: ViewerRunState | undefined;
  let finalReportHtml: string | undefined;

  const stepsPubSub = yield* PubSub.unbounded<ViewerRunState>();

  const viewerHtml = yield* buildViewerShell().pipe(
    Effect.catchCause((cause) =>
      Effect.logDebug("Viewer build failed, using fallback", { cause }).pipe(
        Effect.as(
          '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:system-ui;background:#0f172a;color:#94a3b8;display:flex;align-items:center;justify-content:center;height:100vh}</style></head><body><p>Live view unavailable (viewer build failed).</p></body></html>',
        ),
      ),
    ),
  );

  const broadcastSse = (eventType: string, data: string): void => {
    const message = `event: ${eventType}\ndata: ${data}\n\n`;
    for (const client of sseClients) {
      if (client.destroyed) {
        sseClients.delete(client);
        continue;
      }
      try {
        client.write(message);
      } catch {
        sseClients.delete(client);
        client.end();
      }
    }
  };

  const broadcastReplayEvents = (events: eventWithTime[]): void => {
    if (events.length === 0) return;
    accumulatedReplayEvents.push(...events);
    broadcastSse("replay", JSON.stringify(events));
  };

  const broadcastRunState = (state: ViewerRunState): void => {
    latestRunState = state;
    broadcastSse("steps", JSON.stringify(state));
  };

  const handleSseRequest = (request: IncomingMessage, response: SseClient): void => {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      ...NO_CACHE_HEADERS,
    });
    response.flushHeaders();
    sseClients.add(response);
    request.on("close", () => sseClients.delete(response));
  };

  const handleStepsPost = (request: IncomingMessage, response: SseClient): void => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      try {
        const body = Buffer.concat(chunks).toString("utf-8");
        const state = decodeRunState(JSON.parse(body));
        broadcastRunState(state);
        response.writeHead(204, NO_CACHE_HEADERS);
        response.end();
      } catch {
        response.writeHead(400, { "Content-Type": "text/plain", ...NO_CACHE_HEADERS });
        response.end("Invalid request body");
      }
    });
  };

  const routeRequest = (request: IncomingMessage, response: SseClient): void => {
    const pathname = new URL(request.url ?? "/", parsedUrl).pathname;

    if (pathname === "/") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...NO_CACHE_HEADERS });
      response.end(viewerHtml);
      return;
    }

    if (pathname === "/events") {
      handleSseRequest(request, response);
      return;
    }

    if (pathname === "/latest.json") {
      const body = JSON.stringify(accumulatedReplayEvents);
      response.writeHead(200, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        ...NO_CACHE_HEADERS,
      });
      response.end(body);
      return;
    }

    if (pathname === "/steps") {
      if (request.method === "POST") {
        handleStepsPost(request, response);
        return;
      }
      const body = JSON.stringify(
        latestRunState ??
          new ViewerRunState({ title: "", status: "running", summary: undefined, steps: [] }),
      );
      response.writeHead(200, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        ...NO_CACHE_HEADERS,
      });
      response.end(body);
      return;
    }

    if (pathname === "/report") {
      if (finalReportHtml) {
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          ...NO_CACHE_HEADERS,
        });
        response.end(finalReportHtml);
      } else {
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          ...NO_CACHE_HEADERS,
        });
        response.end(
          '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="2;url=/"></head><body><p>Report not yet available. Redirecting&hellip;</p></body></html>',
        );
      }
      return;
    }

    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", ...NO_CACHE_HEADERS });
    response.end("Not found");
  };

  const server = createServer(routeRequest);

  yield* listenServer(server, parsedUrl.hostname, Number(parsedUrl.port));

  const stepsBroadcastFiber = yield* Stream.fromPubSub(stepsPubSub).pipe(
    Stream.tap((state) => Effect.sync(() => broadcastRunState(state))),
    Stream.runDrain,
    Effect.forkDetach,
  );

  return {
    url: parsedUrl.toString(),
    pushReplayEvents: (events: eventWithTime[]) => broadcastReplayEvents(events),
    pushRunState: (state: ViewerRunState) => {
      PubSub.publishUnsafe(stepsPubSub, state);
    },
    getLatestRunState: () => latestRunState,
    complete: (reportHtml: string) => {
      finalReportHtml = reportHtml;
      broadcastSse("complete", "{}");
    },
    close: Effect.gen(function* () {
      yield* Fiber.interrupt(stepsBroadcastFiber);
      for (const client of sseClients) client.end();
      sseClients.clear();
      yield* closeServer(server);
    }),
  } satisfies LiveViewHandle;
});
