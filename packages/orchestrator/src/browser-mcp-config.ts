import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { DEFAULT_BROWSER_MCP_SERVER_NAME } from "./constants.js";
import type { AgentProviderSettings } from "@browser-tester/agent";

const require = createRequire(join(process.cwd(), "package.json"));

export const getBrowserMcpEntrypoint = (): string => {
  const mcpPackageEntrypoint = require.resolve("@browser-tester/mcp");
  return join(dirname(mcpPackageEntrypoint), "start.js");
};

export const buildBrowserMcpSettings = (
  providerSettings: AgentProviderSettings | undefined,
  browserMcpServerName: string = DEFAULT_BROWSER_MCP_SERVER_NAME,
): AgentProviderSettings => ({
  ...(providerSettings ?? {}),
  mcpServers: {
    ...(providerSettings?.mcpServers ?? {}),
    [browserMcpServerName]: {
      command: process.execPath,
      args: [getBrowserMcpEntrypoint()],
    },
  },
});
