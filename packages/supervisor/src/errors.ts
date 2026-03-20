import { Cause, Schema } from "effect";

const formatCause = (cause: unknown): string =>
  Cause.isCause(cause) ? Cause.pretty(cause) : String(cause);

export class ExecutionError extends Schema.ErrorClass<ExecutionError>("ExecutionError")({
  _tag: Schema.tag("ExecutionError"),
  stage: Schema.NonEmptyString,
  cause: Schema.Unknown,
}) {
  message = `Browser flow execution failed during ${this.stage}: ${formatCause(this.cause)}`;
}
