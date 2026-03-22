import { Schema } from "effect";

export const SessionId = Schema.String.pipe(Schema.brand("AcpSessionId"));
export type SessionId = typeof SessionId.Type;

export const ToolCallId = Schema.String.pipe(Schema.brand("AcpToolCallId"));
export type ToolCallId = typeof ToolCallId.Type;

export const TerminalId = Schema.String.pipe(Schema.brand("AcpTerminalId"));
export type TerminalId = typeof TerminalId.Type;

export const ProtocolVersion = Schema.Int;

export const RequestId = Schema.Union([Schema.String, Schema.Number]);
export type RequestId = typeof RequestId.Type;

export class Implementation extends Schema.Class<Implementation>("AcpImplementation")({
  name: Schema.String,
  title: Schema.OptionFromOptionalKey(Schema.String),
  version: Schema.OptionFromOptionalKey(Schema.String),
}) {}

export class FileSystemCapabilities extends Schema.Class<FileSystemCapabilities>(
  "AcpFileSystemCapabilities",
)({
  readTextFile: Schema.optional(Schema.Boolean),
  writeTextFile: Schema.optional(Schema.Boolean),
}) {}

export class ClientCapabilities extends Schema.Class<ClientCapabilities>("AcpClientCapabilities")({
  fs: Schema.optional(FileSystemCapabilities),
  terminal: Schema.optional(Schema.Boolean),
}) {}

export class PromptCapabilities extends Schema.Class<PromptCapabilities>("AcpPromptCapabilities")({
  image: Schema.optional(Schema.Boolean),
  audio: Schema.optional(Schema.Boolean),
  embeddedContext: Schema.optional(Schema.Boolean),
}) {}

export class McpCapabilities extends Schema.Class<McpCapabilities>("AcpMcpCapabilities")({
  http: Schema.optional(Schema.Boolean),
  sse: Schema.optional(Schema.Boolean),
}) {}

export class SessionCapabilities extends Schema.Class<SessionCapabilities>(
  "AcpSessionCapabilities",
)({}) {}

export class AgentCapabilities extends Schema.Class<AgentCapabilities>("AcpAgentCapabilities")({
  loadSession: Schema.optional(Schema.Boolean),
  promptCapabilities: Schema.optional(PromptCapabilities),
  mcpCapabilities: Schema.optional(McpCapabilities),
  sessionCapabilities: Schema.optional(SessionCapabilities),
}) {}

export class EnvVariable extends Schema.Class<EnvVariable>("AcpEnvVariable")({
  name: Schema.String,
  value: Schema.String,
}) {}

export const McpServerStdio = Schema.Struct({
  name: Schema.String,
  command: Schema.String,
  args: Schema.Array(Schema.String),
  env: Schema.Array(EnvVariable),
});

export const McpServerHttp = Schema.Struct({
  type: Schema.Literal("http"),
  name: Schema.String,
  url: Schema.String,
  headers: Schema.Array(Schema.Struct({ name: Schema.String, value: Schema.String })),
});

export const McpServerSse = Schema.Struct({
  type: Schema.Literal("sse"),
  name: Schema.String,
  url: Schema.String,
  headers: Schema.Array(Schema.Struct({ name: Schema.String, value: Schema.String })),
});

export const McpServer = Schema.Union([McpServerStdio, McpServerHttp, McpServerSse]);
export type McpServer = typeof McpServer.Type;

export class InitializeRequest extends Schema.Class<InitializeRequest>("AcpInitializeRequest")({
  protocolVersion: ProtocolVersion,
  clientCapabilities: Schema.optional(ClientCapabilities),
  clientInfo: Schema.optional(Implementation),
}) {}

export class InitializeResponse extends Schema.Class<InitializeResponse>("AcpInitializeResponse")({
  protocolVersion: ProtocolVersion,
  agentCapabilities: Schema.optional(AgentCapabilities),
  agentInfo: Schema.optional(Implementation),
  authMethods: Schema.optional(Schema.Array(Schema.Unknown)),
}) {}

export class AuthenticateRequest extends Schema.Class<AuthenticateRequest>(
  "AcpAuthenticateRequest",
)({
  methodId: Schema.String,
}) {}

export class AuthenticateResponse extends Schema.Class<AuthenticateResponse>(
  "AcpAuthenticateResponse",
)({}) {}

export class SessionMode extends Schema.Class<SessionMode>("AcpSessionMode")({
  id: Schema.String,
  name: Schema.String,
  description: Schema.OptionFromOptionalKey(Schema.String),
}) {}

export class SessionModeState extends Schema.Class<SessionModeState>("AcpSessionModeState")({
  currentModeId: Schema.String,
  availableModes: Schema.Array(SessionMode),
}) {}

export class NewSessionRequest extends Schema.Class<NewSessionRequest>("AcpNewSessionRequest")({
  cwd: Schema.OptionFromOptionalKey(Schema.String),
  mcpServers: Schema.optional(Schema.Array(McpServer)),
}) {}

export class NewSessionResponse extends Schema.Class<NewSessionResponse>("AcpNewSessionResponse")({
  sessionId: SessionId,
  modes: Schema.optional(SessionModeState),
  configOptions: Schema.optional(Schema.Array(Schema.Unknown)),
}) {}

export class LoadSessionRequest extends Schema.Class<LoadSessionRequest>("AcpLoadSessionRequest")({
  sessionId: SessionId,
  cwd: Schema.OptionFromOptionalKey(Schema.String),
  mcpServers: Schema.optional(Schema.Array(McpServer)),
}) {}

export class LoadSessionResponse extends Schema.Class<LoadSessionResponse>(
  "AcpLoadSessionResponse",
)({}) {}

export const TextContent = Schema.Struct({
  type: Schema.Literal("text"),
  text: Schema.String,
});

export const ImageContent = Schema.Struct({
  type: Schema.Literal("image"),
  mimeType: Schema.String,
  data: Schema.String,
});

export const ResourceLink = Schema.Struct({
  type: Schema.Literal("resource_link"),
  uri: Schema.String,
  name: Schema.String,
  mimeType: Schema.optional(Schema.String),
});

export const EmbeddedResource = Schema.Struct({
  type: Schema.Literal("resource"),
  resource: Schema.Struct({
    uri: Schema.String,
    text: Schema.optional(Schema.String),
    mimeType: Schema.optional(Schema.String),
  }),
});

export const ContentBlock = Schema.Union([
  TextContent,
  ImageContent,
  ResourceLink,
  EmbeddedResource,
]);
export type ContentBlock = typeof ContentBlock.Type;

export class PromptRequest extends Schema.Class<PromptRequest>("AcpPromptRequest")({
  sessionId: SessionId,
  prompt: Schema.Array(ContentBlock),
}) {}

export const StopReason = Schema.Literals([
  "end_turn",
  "max_tokens",
  "max_model_requests",
  "refused",
  "cancelled",
] as const);
export type StopReason = typeof StopReason.Type;

export class PromptResponse extends Schema.Class<PromptResponse>("AcpPromptResponse")({
  stopReason: StopReason,
}) {}

export class CancelNotification extends Schema.Class<CancelNotification>("AcpCancelNotification")({
  sessionId: SessionId,
}) {}

export const ToolKind = Schema.Literals([
  "read",
  "edit",
  "delete",
  "move",
  "search",
  "execute",
  "think",
  "fetch",
  "switch_mode",
  "other",
] as const);
export type ToolKind = typeof ToolKind.Type;

export const ToolCallStatus = Schema.Literals([
  "pending",
  "in_progress",
  "completed",
  "error",
] as const);
export type ToolCallStatus = typeof ToolCallStatus.Type;

export class ToolCallLocation extends Schema.Class<ToolCallLocation>("AcpToolCallLocation")({
  path: Schema.String,
  line: Schema.OptionFromOptionalKey(Schema.Number),
}) {}

export const ToolCallContentItem = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("content"),
    content: ContentBlock,
  }),
  Schema.Struct({
    type: Schema.Literal("diff"),
    path: Schema.String,
    oldText: Schema.NullOr(Schema.String),
    newText: Schema.String,
  }),
  Schema.Struct({
    type: Schema.Literal("terminal"),
    terminalId: Schema.String,
  }),
]);
export type ToolCallContentItem = typeof ToolCallContentItem.Type;

export const PlanEntryPriority = Schema.Literals(["high", "medium", "low"] as const);
export type PlanEntryPriority = typeof PlanEntryPriority.Type;

export const PlanEntryStatus = Schema.Literals(["pending", "in_progress", "completed"] as const);
export type PlanEntryStatus = typeof PlanEntryStatus.Type;

export class PlanEntry extends Schema.Class<PlanEntry>("AcpPlanEntry")({
  content: Schema.String,
  priority: PlanEntryPriority,
  status: PlanEntryStatus,
}) {}

export const SessionUpdate = Schema.Union([
  Schema.Struct({
    sessionUpdate: Schema.Literal("user_message_chunk"),
    content: ContentBlock,
  }),
  Schema.Struct({
    sessionUpdate: Schema.Literal("agent_message_chunk"),
    content: ContentBlock,
  }),
  Schema.Struct({
    sessionUpdate: Schema.Literal("agent_thought_chunk"),
    content: ContentBlock,
  }),
  Schema.Struct({
    sessionUpdate: Schema.Literal("tool_call"),
    toolCallId: Schema.String,
    title: Schema.optional(Schema.String),
    kind: Schema.optional(ToolKind),
    status: Schema.optional(ToolCallStatus),
    content: Schema.optional(Schema.Array(ToolCallContentItem)),
    locations: Schema.optional(Schema.Array(ToolCallLocation)),
    rawInput: Schema.optional(Schema.Unknown),
    rawOutput: Schema.optional(Schema.Unknown),
  }),
  Schema.Struct({
    sessionUpdate: Schema.Literal("tool_call_update"),
    toolCallId: Schema.String,
    title: Schema.optional(Schema.String),
    kind: Schema.optional(ToolKind),
    status: Schema.optional(ToolCallStatus),
    content: Schema.optional(Schema.Array(ToolCallContentItem)),
    locations: Schema.optional(Schema.Array(ToolCallLocation)),
    rawInput: Schema.optional(Schema.Unknown),
    rawOutput: Schema.optional(Schema.Unknown),
  }),
  Schema.Struct({
    sessionUpdate: Schema.Literal("plan"),
    entries: Schema.Array(PlanEntry),
  }),
  Schema.Struct({
    sessionUpdate: Schema.Literal("available_commands_update"),
    commands: Schema.Array(Schema.Unknown),
  }),
  Schema.Struct({
    sessionUpdate: Schema.Literal("current_mode_update"),
    modeId: Schema.String,
  }),
  Schema.Struct({
    sessionUpdate: Schema.Literal("session_info_update"),
    title: Schema.optional(Schema.String),
    updatedAt: Schema.optional(Schema.String),
  }),
]);
export type SessionUpdate = typeof SessionUpdate.Type;

export class SessionNotification extends Schema.Class<SessionNotification>(
  "AcpSessionNotification",
)({
  sessionId: SessionId,
  update: SessionUpdate,
}) {}

export class SetSessionModeRequest extends Schema.Class<SetSessionModeRequest>(
  "AcpSetSessionModeRequest",
)({
  sessionId: SessionId,
  modeId: Schema.String,
}) {}

export class SetSessionModeResponse extends Schema.Class<SetSessionModeResponse>(
  "AcpSetSessionModeResponse",
)({}) {}

export const PermissionOptionKind = Schema.Literals([
  "allow_once",
  "allow_always",
  "reject_once",
  "reject_always",
] as const);

export class PermissionOption extends Schema.Class<PermissionOption>("AcpPermissionOption")({
  optionId: Schema.String,
  name: Schema.String,
  kind: PermissionOptionKind,
}) {}

export class RequestPermissionRequest extends Schema.Class<RequestPermissionRequest>(
  "AcpRequestPermissionRequest",
)({
  sessionId: SessionId,
  toolCall: Schema.Struct({
    toolCallId: Schema.String,
    title: Schema.optional(Schema.String),
    kind: Schema.optional(ToolKind),
    status: Schema.optional(ToolCallStatus),
  }),
  options: Schema.Array(PermissionOption),
}) {}

export const RequestPermissionOutcome = Schema.Union([
  Schema.Struct({ outcome: Schema.Literal("cancelled") }),
  Schema.Struct({ outcome: Schema.Literal("selected"), optionId: Schema.String }),
]);
export type RequestPermissionOutcome = typeof RequestPermissionOutcome.Type;

export class RequestPermissionResponse extends Schema.Class<RequestPermissionResponse>(
  "AcpRequestPermissionResponse",
)({
  outcome: RequestPermissionOutcome,
}) {}

export class ReadTextFileRequest extends Schema.Class<ReadTextFileRequest>(
  "AcpReadTextFileRequest",
)({
  sessionId: SessionId,
  path: Schema.String,
  offset: Schema.OptionFromOptionalKey(Schema.Number),
  limit: Schema.OptionFromOptionalKey(Schema.Number),
}) {}

export class ReadTextFileResponse extends Schema.Class<ReadTextFileResponse>(
  "AcpReadTextFileResponse",
)({}) {}

export class WriteTextFileRequest extends Schema.Class<WriteTextFileRequest>(
  "AcpWriteTextFileRequest",
)({
  sessionId: SessionId,
  path: Schema.String,
  content: Schema.String,
}) {}

export class WriteTextFileResponse extends Schema.Class<WriteTextFileResponse>(
  "AcpWriteTextFileResponse",
)({}) {}
