import { Schema } from "effect";

export class FlowNotFoundError extends Schema.ErrorClass<FlowNotFoundError>("FlowNotFoundError")({
  _tag: Schema.tag("FlowNotFoundError"),
  lookupType: Schema.Literal("slug", "filePath"),
  lookupValue: Schema.String,
}) {
  message = `Saved flow not found for ${this.lookupType}: ${this.lookupValue}`;
}

export class FlowParseError extends Schema.ErrorClass<FlowParseError>("FlowParseError")({
  _tag: Schema.tag("FlowParseError"),
  filePath: Schema.String,
}) {
  message = `Saved flow at ${this.filePath} could not be parsed.`;
}

export class FlowStorageError extends Schema.ErrorClass<FlowStorageError>("FlowStorageError")({
  _tag: Schema.tag("FlowStorageError"),
  operation: Schema.String,
  filePath: Schema.String,
  cause: Schema.String,
}) {
  message = `Saved flow storage failed during ${this.operation} for ${this.filePath}: ${this.cause}`;
}
