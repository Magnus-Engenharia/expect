import * as fsPromises from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Effect, Schema } from "effect";
import { PROMPT_HISTORY_FILE, PROMPT_HISTORY_LIMIT, TESTIE_STATE_DIR } from "./constants";

const PromptHistorySchema = Schema.Array(Schema.String);

const getPromptHistoryFilePath = (): string =>
  path.join(os.homedir(), TESTIE_STATE_DIR, PROMPT_HISTORY_FILE);

class PromptHistoryReadError extends Schema.ErrorClass<PromptHistoryReadError>(
  "PromptHistoryReadError",
)({
  _tag: Schema.tag("PromptHistoryReadError"),
  cause: Schema.String,
}) {
  message = `Failed to read prompt history: ${this.cause}`;
}

class PromptHistoryWriteError extends Schema.ErrorClass<PromptHistoryWriteError>(
  "PromptHistoryWriteError",
)({
  _tag: Schema.tag("PromptHistoryWriteError"),
  cause: Schema.String,
}) {
  message = `Failed to write prompt history: ${this.cause}`;
}

const decodePromptHistory = Schema.decodeEffect(Schema.fromJsonString(PromptHistorySchema));

const loadEffect = Effect.fn("PromptHistory.load")(function* () {
  const filePath = getPromptHistoryFilePath();

  const content = yield* Effect.tryPromise({
    try: () => fsPromises.readFile(filePath, "utf-8"),
    catch: (cause) => new PromptHistoryReadError({ cause: String(cause) }),
  }).pipe(Effect.catchTag("PromptHistoryReadError", () => Effect.succeed("[]")));

  const decoded = yield* decodePromptHistory(content).pipe(
    Effect.catchTag("SchemaError", () => Effect.succeed([] as readonly string[])),
  );

  return Array.from(decoded);
});

const appendEffect = Effect.fn("PromptHistory.append")(function* (prompt: string) {
  const trimmed = prompt.trim();
  if (!trimmed) return yield* loadEffect();

  const existing = yield* loadEffect();
  const updated = [trimmed, ...existing.filter((entry) => entry !== trimmed)].slice(
    0,
    PROMPT_HISTORY_LIMIT,
  );

  const filePath = getPromptHistoryFilePath();

  yield* Effect.tryPromise({
    try: async () => {
      await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
      await fsPromises.writeFile(filePath, JSON.stringify(updated), "utf-8");
    },
    catch: (cause) => new PromptHistoryWriteError({ cause: String(cause) }),
  }).pipe(Effect.catchTag("PromptHistoryWriteError", Effect.die));

  return updated;
});

export const loadPromptHistory = (): Promise<string[]> => Effect.runPromise(loadEffect());

export const appendPrompt = (prompt: string): Promise<string[]> =>
  Effect.runPromise(appendEffect(prompt));
