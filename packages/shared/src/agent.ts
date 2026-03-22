import { Schema, ServiceMap, Stream } from "effect";
import type { ExecutionEvent } from "./models.js";

export class AgentStreamError extends Schema.ErrorClass<AgentStreamError>("AgentStreamError")({
  _tag: Schema.tag("AgentStreamError"),
  provider: Schema.String,
  cause: Schema.String,
}) {
  message = `${this.provider} agent error: ${this.cause}`;
}

export class AgentStreamOptions extends Schema.Class<AgentStreamOptions>("AgentStreamOptions")({
  cwd: Schema.String,
  sessionId: Schema.Option(Schema.String),
  prompt: Schema.String,
  systemPrompt: Schema.Option(Schema.String),
}) {}

export class Agent extends ServiceMap.Service<
  Agent,
  {
    readonly stream: (
      options: AgentStreamOptions,
    ) => Stream.Stream<ExecutionEvent, AgentStreamError>;
  }
>()("@browser-tester/Agent") {}
