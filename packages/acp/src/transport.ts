import { Deferred, Effect, Layer, Queue, Ref, Schema, ServiceMap, Stream } from "effect";
import { JSON_RPC_VERSION } from "./constants.js";
import { JsonRpcParseError, TransportClosedError } from "./errors.js";

interface JsonRpcOutgoing {
  readonly jsonrpc: typeof JSON_RPC_VERSION;
  readonly id?: string | number;
  readonly method?: string;
  readonly params?: unknown;
  readonly result?: unknown;
  readonly error?: { readonly code: number; readonly message: string };
}

const JsonRpcIncoming = Schema.Struct({
  jsonrpc: Schema.Literal(JSON_RPC_VERSION),
  id: Schema.optional(Schema.Union([Schema.String, Schema.Number, Schema.Null])),
  method: Schema.optional(Schema.String),
  params: Schema.optional(Schema.Unknown),
  result: Schema.optional(Schema.Unknown),
  error: Schema.optional(
    Schema.Struct({
      code: Schema.Number,
      message: Schema.String,
      data: Schema.optional(Schema.Unknown),
    }),
  ),
});

export class StdioTransport extends ServiceMap.Service<StdioTransport>()("@acp/StdioTransport", {
  make: Effect.gen(function* () {
    const incoming = yield* Queue.unbounded<string>();
    const pendingResponses = new Map<
      string | number,
      Deferred.Deferred<unknown, JsonRpcParseError>
    >();

    const writeLine = Effect.fn("StdioTransport.writeLine")(function* (message: JsonRpcOutgoing) {
      const line = JSON.stringify(message);
      yield* Effect.sync(() => process.stdout.write(line + "\n"));
    });

    const sendNotification = Effect.fn("StdioTransport.sendNotification")(function* (
      method: string,
      params: unknown,
    ) {
      yield* writeLine({ jsonrpc: JSON_RPC_VERSION, method, params });
    });

    const sendResponse = Effect.fn("StdioTransport.sendResponse")(function* (
      id: string | number,
      result: unknown,
    ) {
      yield* writeLine({ jsonrpc: JSON_RPC_VERSION, id, result });
    });

    const sendError = Effect.fn("StdioTransport.sendError")(function* (
      id: string | number,
      code: number,
      message: string,
    ) {
      yield* writeLine({
        jsonrpc: JSON_RPC_VERSION,
        id,
        error: { code, message },
      });
    });

    const nextRequestId = yield* Ref.make(1);

    const sendRequest = Effect.fn("StdioTransport.sendRequest")(function* (
      method: string,
      params: unknown,
    ) {
      const id = yield* Ref.getAndUpdate(nextRequestId, (current) => current + 1);
      const deferred = yield* Deferred.make<unknown, JsonRpcParseError>();
      pendingResponses.set(id, deferred);

      yield* writeLine({ jsonrpc: JSON_RPC_VERSION, id, method, params });

      return yield* Deferred.await(deferred);
    });

    const processLine = Effect.fn("StdioTransport.processLine")(function* (line: string) {
      const trimmed = line.trim();
      if (trimmed.length === 0) return;

      const parsed = yield* Schema.decodeEffect(Schema.fromJsonString(JsonRpcIncoming))(
        trimmed,
      ).pipe(
        Effect.catchTag("SchemaError", (schemaError) =>
          new JsonRpcParseError({ cause: String(schemaError) }).asEffect(),
        ),
      );

      if (parsed.id !== undefined && parsed.method === undefined) {
        const responseId = parsed.id;
        if (responseId !== undefined && responseId !== null && typeof responseId !== "boolean") {
          const deferred = pendingResponses.get(responseId);
          if (deferred) {
            pendingResponses.delete(responseId);
            if (parsed.error !== undefined) {
              yield* Deferred.fail(
                deferred,
                new JsonRpcParseError({ cause: parsed.error.message }),
              );
            } else {
              yield* Deferred.succeed(deferred, parsed.result);
            }
          }
        }
        return;
      }

      yield* Queue.offer(incoming, trimmed);
    });

    const startReading = Effect.gen(function* () {
      let buffer = "";

      yield* Effect.callback<void, TransportClosedError>((resume) => {
        const onData = (chunk: Buffer) => {
          buffer += chunk.toString("utf-8");
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.trim().length > 0) {
              Effect.runFork(processLine(line));
            }
          }
        };

        const onEnd = () => {
          resume(Effect.fail(new TransportClosedError({})));
        };

        process.stdin.on("data", onData);
        process.stdin.on("end", onEnd);
        process.stdin.resume();
        process.stdin.setEncoding("utf-8");
      });
    });

    const incomingMessages = Stream.fromQueue(incoming);

    return {
      sendNotification,
      sendResponse,
      sendError,
      sendRequest,
      startReading,
      incomingMessages,
    } as const;
  }),
}) {
  static layer = Layer.effect(this)(this.make);
}
