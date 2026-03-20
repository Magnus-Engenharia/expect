import { resolveTestTarget } from "./resolve-test-target";
import type {
  BrowserEnvironmentHints,
  CommitSummary,
  TestAction,
  TestTarget,
  TestTargetSelection,
} from "./types";

export interface EnvironmentOverrides {
  baseUrl?: string;
  headed?: boolean;
  cookies?: boolean;
}

const parseBooleanEnvironmentValue = (value: string | undefined): boolean | undefined => {
  if (!value) return undefined;
  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue === "true" || normalizedValue === "1" || normalizedValue === "yes")
    return true;
  if (normalizedValue === "false" || normalizedValue === "0" || normalizedValue === "no")
    return false;
  return undefined;
};

export const getBrowserEnvironment = (
  overrides?: EnvironmentOverrides,
): BrowserEnvironmentHints => ({
  baseUrl: overrides?.baseUrl ?? process.env.BROWSER_TESTER_BASE_URL,
  headed: overrides?.headed ?? parseBooleanEnvironmentValue(process.env.BROWSER_TESTER_HEADED),
  cookies: overrides?.cookies ?? parseBooleanEnvironmentValue(process.env.BROWSER_TESTER_COOKIES),
});

const createTargetSelection = (action: TestAction, commit?: CommitSummary): TestTargetSelection => {
  if (action === "select-commit") {
    return {
      action,
      commitHash: commit?.hash,
      commitShortHash: commit?.shortHash,
      commitSubject: commit?.subject,
    };
  }

  return { action };
};

export const resolveBrowserTarget = (options: {
  action: TestAction;
  commit?: CommitSummary;
  cwd?: string;
}): TestTarget =>
  resolveTestTarget({
    cwd: options.cwd,
    selection: createTargetSelection(options.action, options.commit),
  });
