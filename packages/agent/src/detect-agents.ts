import { execSync } from "node:child_process";

export type SupportedAgent = "claude" | "codex" | "cursor";

const SUPPORTED_AGENTS: readonly SupportedAgent[] = ["claude", "codex", "cursor"];

const isCommandAvailable = (command: string): boolean => {
  try {
    execSync(`which ${command}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
};

export const detectAvailableAgents = (): SupportedAgent[] =>
  SUPPORTED_AGENTS.filter(isCommandAvailable);
