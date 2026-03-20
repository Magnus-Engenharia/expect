import { ensureSafeCurrentWorkingDirectory } from "@browser-tester/utils";
import { Command, InvalidOptionArgumentError } from "commander";
import { render } from "ink";
import { QueryClientProvider } from "@tanstack/react-query";
import { App } from "./components/app";
import { ALT_SCREEN_OFF, ALT_SCREEN_ON, VERSION } from "./constants";
import { ThemeProvider } from "./components/theme-context";
import { loadThemeName } from "./utils/load-theme";
import {
  getCommitSummary,
  isRunningInAgent,
  loadFlowBySlug,
  type AgentProvider,
  type TestAction,
} from "@browser-tester/supervisor";
import { autoDetectAndTest, runTest } from "./utils/run-test";
import { runHealthcheckHeadless, runHealthcheckInteractive } from "./utils/run-healthcheck";
import { useNavigationStore, type Screen } from "./stores/use-navigation";
import { usePreferencesStore } from "./stores/use-preferences";
import { useFlowSessionStore } from "./stores/use-flow-session";
import { queryClient } from "./query-client";
import { resolveTestRunConfig, type TestRunConfig } from "./utils/test-run-config";
import { setInkInstance } from "./utils/clear-ink-display";

const parseAgentProvider = (value: string): AgentProvider => {
  if (value === "claude" || value === "codex" || value === "cursor") {
    return value;
  }

  throw new InvalidOptionArgumentError(
    `Unsupported agent "${value}". Use one of: claude, codex, cursor.`,
  );
};

const program = new Command()
  .name("testie")
  .description("AI-powered browser testing for your changes")
  .version(VERSION, "-v, --version")
  .option("-f, --flow <slug>", "load a saved flow by slug")
  .option("-m, --message <instruction>", "natural language instruction for what to test")
  .option(
    "--executor <provider>",
    "agent for execution (claude, codex, cursor)",
    parseAgentProvider,
    "codex",
  )
  .option("--execution-model <model>", "specific model for the execution agent")
  .option("--base-url <url>", "browser base URL (overrides BROWSER_TESTER_BASE_URL)")
  .option("--headed", "run browser visibly instead of headless")
  .option("--cookies", "sync cookies from your browser profile")
  .option("--no-cookies", "disable cookie sync")
  .addHelpText(
    "after",
    `
Examples:
  $ testie                                    open interactive TUI
  $ testie -m "test the login flow"           run a direct browser test
  $ testie --flow checkout-happy-path         replay a saved flow
  $ testie branch -m "verify signup"          test all branch changes

Environment variables:
  BROWSER_TESTER_BASE_URL     base URL for the browser (e.g. http://localhost:3000)
  BROWSER_TESTER_HEADED       run headed by default (true | 1)
  BROWSER_TESTER_COOKIES      enable cookie sync by default (true | 1)`,
  );

const isHeadless = () => isRunningInAgent() || !process.stdin.isTTY;

ensureSafeCurrentWorkingDirectory();

const renderApp = () => {
  const initialTheme = loadThemeName() ?? undefined;
  process.stdout.write(ALT_SCREEN_ON);
  process.on("exit", () => process.stdout.write(ALT_SCREEN_OFF));
  const instance = render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider initialTheme={initialTheme}>
        <App />
      </ThemeProvider>
    </QueryClientProvider>,
  );
  setInkInstance(instance);
};

const seedStoreFromConfig = async (config: TestRunConfig): Promise<void> => {
  const resolvedCommit =
    config.action === "select-commit" && config.commitHash
      ? (getCommitSummary(process.cwd(), config.commitHash) ?? null)
      : null;

  useNavigationStore.setState({ screen: "main" satisfies Screen });
  usePreferencesStore.setState({
    executionProvider: config.executionProvider,
    executionModel: config.executionModel,
    environmentOverrides: config.environmentOverrides,
  });
  useFlowSessionStore.setState({
    testAction: config.action,
    selectedCommit: resolvedCommit,
  });

  if (config.flowSlug) {
    const savedFlow = await loadFlowBySlug(config.flowSlug, process.cwd());
    useFlowSessionStore.getState().applySavedFlow(savedFlow);
    return;
  }

  if (config.message) {
    useFlowSessionStore.getState().submitFlowInstruction(config.message);
  }
};

const createCommandAction =
  (action: TestAction) =>
  async (commitHash?: string): Promise<void> => {
    const config = resolveTestRunConfig(action, program.opts(), commitHash);
    if (isHeadless()) return runTest(config);
    await seedStoreFromConfig(config);
    renderApp();
  };

program
  .command("healthcheck")
  .description("check for untested changes")
  .action(async () => {
    if (isHeadless()) {
      runHealthcheckHeadless();
      return;
    }
    const { shouldTest, scope } = await runHealthcheckInteractive();
    if (!shouldTest) return;
    const actionByScope: Record<string, TestAction> = {
      changes: "test-changes",
      "unstaged-changes": "test-unstaged",
      "entire-branch": "test-branch",
      default: "test-changes",
    };
    const action = actionByScope[scope] ?? "test-changes";
    const config = resolveTestRunConfig(action, program.opts());
    await seedStoreFromConfig(config);
    renderApp();
  });

program
  .command("unstaged")
  .description("test current unstaged changes (default)")
  .action(createCommandAction("test-unstaged"));

program
  .command("branch")
  .description("test full branch diff against main")
  .action(createCommandAction("test-branch"));

program.action(async () => {
  const config = resolveTestRunConfig("test-changes", program.opts());
  if (isHeadless()) return autoDetectAndTest(config);
  if (
    config.message ||
    config.environmentOverrides ||
    config.executionProvider ||
    config.executionModel
  ) {
    await seedStoreFromConfig(config);
  }
  renderApp();
});

program.parse();
