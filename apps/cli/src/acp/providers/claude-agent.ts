import { Effect, Layer, Option, Stream } from "effect";
import {
  ClientSideConnection,
  AgentSideConnection,
  ndJsonStream,
  type Client,
  type SessionNotification,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionUpdate,
} from "@agentclientprotocol/sdk";
import { ClaudeAcpAgent } from "@zed-industries/claude-agent-acp";
import { Agent, AgentStreamError, AgentStreamOptions } from "@browser-tester/shared/agent";
import {
  AgentText,
  AgentThinking,
  ToolCall,
  ToolResult,
  type ExecutionEvent,
} from "@browser-tester/shared/models";

const mapUpdateToEvents = (update: SessionUpdate): readonly ExecutionEvent[] => {
  if (update.sessionUpdate === "agent_message_chunk" && update.content.type === "text") {
    return [new AgentText({ text: update.content.text })];
  }
  if (update.sessionUpdate === "agent_thought_chunk" && update.content.type === "text") {
    return [new AgentThinking({ text: update.content.text })];
  }
  if (update.sessionUpdate === "tool_call") {
    return [new ToolCall({ toolName: update.title, input: update.rawInput ?? {} })];
  }
  if (update.sessionUpdate === "tool_call_update" && update.status === "completed") {
    return [
      new ToolResult({
        toolName: update.title ?? update.toolCallId,
        result:
          typeof update.rawOutput === "string"
            ? update.rawOutput
            : JSON.stringify(update.rawOutput ?? ""),
        isError: false,
      }),
    ];
  }
  if (update.sessionUpdate === "tool_call_update" && update.status === "error") {
    return [
      new ToolResult({
        toolName: update.title ?? update.toolCallId,
        result: typeof update.rawOutput === "string" ? update.rawOutput : "Tool call failed",
        isError: true,
      }),
    ];
  }
  return [];
};

const connectClaudeAgent = async () => {
  const clientToAgent = new TransformStream<Uint8Array>();
  const agentToClient = new TransformStream<Uint8Array>();

  const clientStream = ndJsonStream(clientToAgent.writable, agentToClient.readable);
  const agentStream = ndJsonStream(agentToClient.writable, clientToAgent.readable);

  new AgentSideConnection((connection) => new ClaudeAcpAgent(connection), agentStream);

  const updateHandlers = new Set<(update: SessionUpdate) => void>();

  const client: Client = {
    requestPermission: async (
      params: RequestPermissionRequest,
    ): Promise<RequestPermissionResponse> => {
      const allowOption = params.options.find(
        (option) => option.kind === "allow_once" || option.kind === "allow_always",
      );
      return {
        outcome: { outcome: "selected", optionId: allowOption?.optionId ?? "allow" },
      };
    },
    sessionUpdate: async (params: SessionNotification) => {
      for (const handler of updateHandlers) handler(params.update);
    },
  };

  const connection = new ClientSideConnection((_agent) => client, clientStream);

  const initResponse = await connection.initialize({
    protocolVersion: 1,
    clientCapabilities: {
      fs: { readTextFile: false, writeTextFile: false },
      terminal: false,
    },
    clientInfo: { name: "testie", version: "0.0.1" },
  });

  if (initResponse.authMethods && initResponse.authMethods.length > 0) {
    const methodId = initResponse.authMethods[0].id;
    try {
      await connection.authenticate({ methodId });
    } catch {
      throw new Error("Claude Agent is not authenticated. Run `claude` to log in, then try again.");
    }
  }

  return { connection, updateHandlers };
};

export const layerClaudeAgent = Layer.effect(Agent)(
  Effect.gen(function* () {
    return Agent.of({
      stream: (options: AgentStreamOptions) =>
        Stream.unwrap(
          Effect.tryPromise({
            try: async () => {
              const { connection, updateHandlers } = await connectClaudeAgent();

              let session;
              try {
                session = await connection.newSession({ cwd: options.cwd, mcpServers: [] });
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
                if (errorMessage.includes("auth_required")) {
                  throw new Error(
                    "Claude Agent requires authentication. Run `claude` to log in, then try again.",
                  );
                }
                throw new Error(`Failed to create session: ${errorMessage}`);
              }

              const eventQueue = new Array<ExecutionEvent>();
              let resolveNext: (() => void) | undefined;
              let done = false;

              updateHandlers.add((update) => {
                const events = mapUpdateToEvents(update);
                eventQueue.push(...events);
                if (events.length > 0) resolveNext?.();
              });

              const promptContent = [
                { type: "text" as const, text: options.prompt },
                ...(Option.isSome(options.systemPrompt)
                  ? [{ type: "text" as const, text: options.systemPrompt.value }]
                  : []),
              ];

              connection
                .prompt({ sessionId: session.sessionId, prompt: promptContent })
                .then(() => {
                  done = true;
                  resolveNext?.();
                })
                .catch((promptError) => {
                  eventQueue.push(
                    new AgentText({
                      text: `Agent error: ${promptError instanceof Error ? promptError.message : String(promptError)}`,
                    }),
                  );
                  done = true;
                  resolveNext?.();
                });

              async function* generateEvents() {
                while (true) {
                  if (eventQueue.length > 0) {
                    yield eventQueue.shift()!;
                    continue;
                  }
                  if (done) break;
                  await new Promise<void>((resolve) => {
                    resolveNext = resolve;
                  });
                }
              }

              return Stream.fromAsyncIterable(
                generateEvents(),
                (cause) => new AgentStreamError({ provider: "claude", cause: String(cause) }),
              );
            },
            catch: (cause) =>
              new AgentStreamError({
                provider: "claude",
                cause: cause instanceof Error ? cause.message : String(cause),
              }),
          }),
        ),
    });
  }),
);
