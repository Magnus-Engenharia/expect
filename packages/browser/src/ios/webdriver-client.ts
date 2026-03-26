import { Effect, Ref } from "effect";
import { WebDriverRequestError } from "./errors";
import { WEBDRIVER_REQUEST_TIMEOUT_MS } from "./constants";

const httpRequest = Effect.fn("WebDriverClient.httpRequest")(function* (
  method: string,
  url: string,
  body?: unknown,
) {
  const response = yield* Effect.tryPromise({
    try: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), WEBDRIVER_REQUEST_TIMEOUT_MS);
      try {
        const result = await fetch(url, {
          method,
          signal: controller.signal,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        clearTimeout(timeout);
        return result;
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    },
    catch: (cause) =>
      new WebDriverRequestError({
        method,
        path: new URL(url).pathname,
        cause: cause instanceof Error ? cause.message : String(cause),
      }),
  });

  const json = yield* Effect.tryPromise({
    try: () => response.json() as Promise<Record<string, unknown>>,
    catch: () =>
      new WebDriverRequestError({
        method,
        path: new URL(url).pathname,
        cause: `HTTP ${response.status}: non-JSON response`,
      }),
  });

  return json;
});

export const createWebDriverClient = Effect.fn("WebDriverClient.create")(function* (port: number) {
  const baseUrl = `http://127.0.0.1:${port}`;
  const sessionIdRef = yield* Ref.make<string | undefined>(undefined);

  const requireSessionId = Effect.fn("WebDriverClient.requireSessionId")(function* () {
    const sessionId = yield* Ref.get(sessionIdRef);
    if (!sessionId) {
      return yield* new WebDriverRequestError({
        method: "GET",
        path: "/session",
        cause: "No active WebDriver session",
      });
    }
    return sessionId;
  });

  const sessionUrl = (path: string) =>
    Effect.gen(function* () {
      const sessionId = yield* requireSessionId();
      return `${baseUrl}/session/${sessionId}${path}`;
    });

  const createSession = Effect.fn("WebDriverClient.createSession")(function* (
    capabilities: Record<string, unknown>,
  ) {
    const response = yield* httpRequest("POST", `${baseUrl}/session`, {
      capabilities: { alwaysMatch: capabilities },
    });
    const value = response.value as Record<string, unknown> | undefined;
    const sessionId = value?.sessionId;
    if (typeof sessionId !== "string") {
      return yield* new WebDriverRequestError({
        method: "POST",
        path: "/session",
        cause: "No sessionId in response",
      });
    }
    yield* Ref.set(sessionIdRef, sessionId);
    return sessionId;
  });

  const deleteSession = Effect.fn("WebDriverClient.deleteSession")(function* () {
    const sessionId = yield* Ref.get(sessionIdRef);
    if (sessionId) {
      yield* httpRequest("DELETE", `${baseUrl}/session/${sessionId}`).pipe(
        Effect.catchTag("WebDriverRequestError", () => Effect.void),
      );
      yield* Ref.set(sessionIdRef, undefined);
    }
  });

  const navigate = Effect.fn("WebDriverClient.navigate")(function* (url: string) {
    const target = yield* sessionUrl("/url");
    yield* httpRequest("POST", target, { url });
  });

  const getUrl = Effect.fn("WebDriverClient.getUrl")(function* () {
    const target = yield* sessionUrl("/url");
    const response = yield* httpRequest("GET", target);
    return String(response.value ?? "");
  });

  const screenshot = Effect.fn("WebDriverClient.screenshot")(function* () {
    const target = yield* sessionUrl("/screenshot");
    const response = yield* httpRequest("GET", target);
    return String(response.value ?? "");
  });

  const executeScript = Effect.fn("WebDriverClient.executeScript")(function* (
    script: string,
    args: unknown[] = [],
  ) {
    const target = yield* sessionUrl("/execute/sync");
    const response = yield* httpRequest("POST", target, { script, args });
    return response.value;
  });

  const getPageSource = Effect.fn("WebDriverClient.getPageSource")(function* () {
    const target = yield* sessionUrl("/source");
    const response = yield* httpRequest("GET", target);
    return String(response.value ?? "");
  });

  const executeActions = Effect.fn("WebDriverClient.executeActions")(function* (actions: unknown) {
    const target = yield* sessionUrl("/actions");
    yield* httpRequest("POST", target, actions);
  });

  return {
    createSession,
    deleteSession,
    navigate,
    getUrl,
    screenshot,
    executeScript,
    getPageSource,
    executeActions,
  } as const;
});
