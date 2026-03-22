import { Schema } from "effect";

export class ClaudeQueryError extends Schema.ErrorClass<ClaudeQueryError>("ClaudeQueryError")({
  _tag: Schema.tag("ClaudeQueryError"),
  cause: Schema.String,
}) {
  message = `Claude query failed: ${this.cause}`;
}

export class CodexRunError extends Schema.ErrorClass<CodexRunError>("CodexRunError")({
  _tag: Schema.tag("CodexRunError"),
  cause: Schema.String,
}) {
  message = `Codex run failed: ${this.cause}`;
}

export class AcpClientError extends Schema.ErrorClass<AcpClientError>("AcpClientError")({
  _tag: Schema.tag("AcpClientError"),
  cause: Schema.String,
}) {
  message = `ACP client error: ${this.cause}`;
}

export class JsonRpcParseError extends Schema.ErrorClass<JsonRpcParseError>("AcpJsonRpcParseError")(
  {
    _tag: Schema.tag("AcpJsonRpcParseError"),
    cause: Schema.String,
  },
) {
  message = `JSON-RPC parse error: ${this.cause}`;
}

export class SessionNotFoundError extends Schema.ErrorClass<SessionNotFoundError>(
  "AcpSessionNotFoundError",
)({
  _tag: Schema.tag("AcpSessionNotFoundError"),
  sessionId: Schema.String,
}) {
  message = `Session not found: ${this.sessionId}`;
}

export class TransportClosedError extends Schema.ErrorClass<TransportClosedError>(
  "AcpTransportClosedError",
)({
  _tag: Schema.tag("AcpTransportClosedError"),
}) {
  message = "Transport connection closed";
}
