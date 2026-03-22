import { spawn, type ChildProcess } from "node:child_process";
import { Deferred, Effect, Option, Queue, Ref, Schema, Stream } from "effect";
import { AcpClientError } from "./errors.js";

const JSON_RPC_VERSION = "2.0" as const;

const IncomingJsonRpc = Schema.Struct({
  id: Schema.optional(Schema.Union([Schema.String, Schema.Number])),
  method: Schema.optional(Schema.String),
  params: Schema.optional(Schema.Unknown),
  result: Schema.optional(Schema.Unknown),
  error: Schema.optional(Schema.Struct({ code: Schema.Number, message: Schema.String })),
});

interface AcpClientConnection {
  readonly process: ChildProcess;
  readonly sendRequest: (method: string, params: unknown) => Effect.Effect<unknown, AcpClientError>;
  readonly sendNotification: (
    method: string,
    params: unknown,
  ) => Effect.Effect<void, AcpClientError>;
  readonly cancel: (sessionId: string) => Effect.Effect<void, AcpClientError>;
  readonly updates: Stream.Stream<SessionUpdateEvent, AcpClientError>;
  readonly close: Effect.Effect<void>;
}

const SessionUpdatePayload = Schema.Struct({
  sessionId: Schema.String,
  update: Schema.Struct({
    sessionUpdate: Schema.String,
    content: Schema.optional(
      Schema.Struct({ type: Schema.String, text: Schema.optional(Schema.String) }),
    ),
    toolCallId: Schema.optional(Schema.String),
    title: Schema.optional(Schema.String),
    kind: Schema.optional(Schema.String),
    status: Schema.optional(Schema.String),
    rawInput: Schema.optional(Schema.Unknown),
    rawOutput: Schema.optional(Schema.Unknown),
  }),
});

export interface SessionUpdateEvent {
  readonly sessionId: string;
  readonly sessionUpdate: string;
  readonly text?: string;
  readonly toolCallId?: string;
  readonly title?: string;
  readonly kind?: string;
  readonly status?: string;
  readonly rawInput?: unknown;
  readonly rawOutput?: unknown;
}

export class AcpAgentConfig extends Schema.Class<AcpAgentConfig>("AcpAgentConfig")({
  command: Schema.String,
  args: Schema.Array(Schema.String),
  env: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  displayName: Schema.String,
}) {}

export const KNOWN_ACP_AGENTS: Record<string, AcpAgentConfig> = {
  "gemini-cli": new AcpAgentConfig({
    command: "gemini",
    args: ["--acp"],
    displayName: "Gemini CLI",
  }),
  "claude-code": new AcpAgentConfig({
    command: "claude",
    args: [],
    displayName: "Claude Code",
  }),
  "codex-cli": new AcpAgentConfig({
    command: "codex",
    args: ["--acp"],
    displayName: "Codex CLI",
  }),
  "cursor-acp": new AcpAgentConfig({
    command: "cursor",
    args: ["--acp"],
    displayName: "Cursor",
  }),
  opencode: new AcpAgentConfig({
    command: "opencode",
    args: [],
    displayName: "OpenCode",
  }),
  "kiro-cli": new AcpAgentConfig({
    command: "kiro",
    args: ["--acp"],
    displayName: "Kiro CLI",
  }),
  copilot: new AcpAgentConfig({
    command: "gh",
    args: ["copilot", "--acp"],
    displayName: "GitHub Copilot",
  }),
};

const parseIncomingLine = (line: string): typeof IncomingJsonRpc.Type | undefined => {
  const trimmed = line.trim();
  if (trimmed.length === 0) return undefined;
  return Option.getOrElse(
    Schema.decodeUnknownOption(Schema.fromJsonString(IncomingJsonRpc))(trimmed),
    () => undefined,
  );
};

export const connectAcpAgent = Effect.fn("connectAcpAgent")(function* (config: AcpAgentConfig) {
  const updateQueue = yield* Queue.unbounded<SessionUpdateEvent>();
  const pendingRequests = new Map<number, Deferred.Deferred<unknown, AcpClientError>>();
  const nextId = yield* Ref.make(1);

  yield* Effect.logDebug("Spawning ACP agent", {
    command: config.command,
    displayName: config.displayName,
  });

  const child = yield* Effect.try({
    try: () =>
      spawn(config.command, [...config.args], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, ...(config.env ?? {}) },
      }),
    catch: (cause) =>
      new AcpClientError({
        cause: `Failed to spawn ${config.displayName}: ${cause instanceof Error ? cause.message : String(cause)}`,
      }),
  });

  let buffer = "";

  const processLine = (line: string) => {
    const parseResult = parseIncomingLine(line);
    if (!parseResult) return;

    if (parseResult.id !== undefined && parseResult.method === undefined) {
      const responseId = parseResult.id;
      if (typeof responseId === "number") {
        const deferred = pendingRequests.get(responseId);
        if (deferred) {
          pendingRequests.delete(responseId);
          if (parseResult.error) {
            Effect.runFork(
              Deferred.fail(deferred, new AcpClientError({ cause: parseResult.error.message })),
            );
          } else {
            Effect.runFork(Deferred.succeed(deferred, parseResult.result));
          }
        }
      }
      return;
    }

    if (parseResult.method === "session/request_permission" && parseResult.id !== undefined) {
      const PermissionParams = Schema.Struct({
        options: Schema.optional(
          Schema.Array(Schema.Struct({ optionId: Schema.String, kind: Schema.String })),
        ),
      });
      const decoded = Schema.decodeUnknownOption(PermissionParams)(parseResult.params);
      const options = Option.isSome(decoded) ? decoded.value.options : undefined;
      const allowOption = options?.find(
        (option) => option.kind === "allow_once" || option.kind === "allow_always",
      );
      const responsePayload = {
        jsonrpc: JSON_RPC_VERSION,
        id: parseResult.id,
        result: {
          outcome: {
            outcome: "selected",
            optionId: allowOption?.optionId ?? "allow",
          },
        },
      };
      child.stdin?.write(JSON.stringify(responsePayload) + "\n");
      return;
    }

    if (parseResult.method === "session/update" && parseResult.params) {
      const decoded = Schema.decodeUnknownSync(SessionUpdatePayload)(parseResult.params);
      const event: SessionUpdateEvent = {
        sessionId: decoded.sessionId,
        sessionUpdate: decoded.update.sessionUpdate,
        text: decoded.update.content?.text,
        toolCallId: decoded.update.toolCallId,
        title: decoded.update.title,
        kind: decoded.update.kind,
        status: decoded.update.status,
        rawInput: decoded.update.rawInput,
        rawOutput: decoded.update.rawOutput,
      };
      Effect.runFork(Queue.offer(updateQueue, event));
    }
  };

  child.stdout?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf-8");
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      processLine(line);
    }
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    Effect.runFork(Effect.logDebug(chunk.toString("utf-8"), { provider: config.displayName }));
  });

  const writeMessage = Effect.fn("AcpClient.writeMessage")(function* (payload: {
    readonly jsonrpc: string;
    readonly id?: number;
    readonly method?: string;
    readonly params?: unknown;
  }) {
    yield* Effect.try({
      try: () => child.stdin?.write(JSON.stringify(payload) + "\n"),
      catch: (cause) =>
        new AcpClientError({
          cause: `Write failed: ${cause instanceof Error ? cause.message : String(cause)}`,
        }),
    });
  });

  const sendRequest = Effect.fn("AcpClient.sendRequest")(function* (
    method: string,
    params: unknown,
  ) {
    const id = yield* Ref.getAndUpdate(nextId, (current) => current + 1);
    const deferred = yield* Deferred.make<unknown, AcpClientError>();
    pendingRequests.set(id, deferred);
    yield* writeMessage({ jsonrpc: JSON_RPC_VERSION, id, method, params });
    return yield* Deferred.await(deferred);
  });

  const sendNotification = Effect.fn("AcpClient.sendNotification")(function* (
    method: string,
    params: unknown,
  ) {
    yield* writeMessage({ jsonrpc: JSON_RPC_VERSION, method, params });
  });

  const cancel = Effect.fn("AcpClient.cancel")(function* (sessionId: string) {
    yield* sendNotification("session/cancel", { sessionId });
  });

  const close = Effect.sync(() => {
    child.stdin?.end();
    child.kill();
  });

  const connection: AcpClientConnection = {
    process: child,
    sendRequest,
    sendNotification,
    cancel,
    updates: Stream.fromQueue(updateQueue),
    close,
  };

  return connection;
});
