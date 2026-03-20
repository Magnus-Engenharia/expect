import type { AgentProvider, EnvironmentOverrides, TestAction } from "@browser-tester/supervisor";

export type { EnvironmentOverrides } from "@browser-tester/supervisor";

export interface TestRunConfig {
  action: TestAction;
  commitHash?: string;
  flowSlug?: string;
  message?: string;
  executionProvider?: AgentProvider;
  executionModel?: string;
  environmentOverrides?: EnvironmentOverrides;
}

interface CommanderGlobalOptions {
  flow?: string;
  message?: string;
  executor?: AgentProvider;
  executionModel?: string;
  baseUrl?: string;
  headed?: boolean;
  cookies?: boolean;
}

export const resolveTestRunConfig = (
  action: TestAction,
  commanderOptions: CommanderGlobalOptions,
  commitHash?: string,
): TestRunConfig => {
  const { baseUrl, headed, cookies, executor, executionModel } = commanderOptions;
  const hasEnvironmentOverrides =
    baseUrl !== undefined || headed !== undefined || cookies !== undefined;

  return {
    action,
    commitHash,
    flowSlug: commanderOptions.flow,
    message: commanderOptions.message,
    executionProvider: executor,
    executionModel,
    environmentOverrides: hasEnvironmentOverrides ? { baseUrl, headed, cookies } : undefined,
  };
};
