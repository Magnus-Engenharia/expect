import { Effect, Layer, Schema, Stream } from "effect";
import { Agent, AgentStreamError } from "@browser-tester/shared/agent";
import { ExecutionEvent } from "@browser-tester/shared/models";
import { AcpAgentConfig } from "@browser-tester/acp";
import { FileSystem } from "effect/FileSystem";
import { NodeServices } from "@effect/platform-node";
import { layerClaudeAgent } from "./providers/claude-agent.js";

export type AgentBackend = string | AcpAgentConfig;

export const layerFor = (_backend: AgentBackend): Layer.Layer<Agent> => layerClaudeAgent;

export const detectAgentBackend = async (): Promise<AgentBackend> => "claude";

export const layerTest = (fixturePath: string) =>
  Layer.effect(
    Agent,
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem;
      return Agent.of({
        stream: () =>
          fileSystem.stream(fixturePath).pipe(
            Stream.decodeText(),
            Stream.splitLines,
            Stream.mapEffect((line) =>
              Schema.decodeEffect(Schema.fromJsonString(ExecutionEvent))(line),
            ),
            Stream.orDie,
          ),
      });
    }),
  ).pipe(Layer.provide(NodeServices.layer));
