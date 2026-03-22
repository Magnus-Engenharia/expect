export { AcpServer } from "./server.js";
export { StdioTransport } from "./transport.js";
export { Agent, AgentStreamError, AgentStreamOptions } from "@browser-tester/shared/agent";
export {
  type AgentBackend,
  layerFor,
  layerClaude,
  layerCodex,
  layerAcp,
  layerTest,
} from "./agent.js";
export { CurrentModel } from "./current-model.js";
export { AcpAgentConfig, KNOWN_ACP_AGENTS } from "./acp-client.js";

export {
  AcpClientError,
  ClaudeQueryError,
  CodexRunError,
  JsonRpcParseError,
  TransportClosedError,
} from "./errors.js";

export {
  SessionId,
  ProtocolVersion,
  RequestId,
  Implementation,
  ClientCapabilities,
  AgentCapabilities,
  PromptCapabilities,
  McpCapabilities,
  EnvVariable,
  McpServer,
  InitializeRequest,
  InitializeResponse,
  AuthenticateRequest,
  AuthenticateResponse,
  NewSessionRequest,
  NewSessionResponse,
  SessionMode,
  SessionModeState,
  LoadSessionRequest,
  LoadSessionResponse,
  ContentBlock,
  PromptRequest,
  StopReason,
  PromptResponse,
  CancelNotification,
  ToolKind,
  ToolCallStatus,
  PlanEntry,
  SessionUpdate,
  SessionNotification,
  SetSessionModeRequest,
  SetSessionModeResponse,
  PermissionOption,
  RequestPermissionRequest,
  RequestPermissionOutcome,
  RequestPermissionResponse,
} from "./schemas.js";

export {
  PROTOCOL_VERSION,
  AGENT_NAME,
  AGENT_TITLE,
  AGENT_VERSION,
  JSON_RPC_VERSION,
} from "./constants.js";
