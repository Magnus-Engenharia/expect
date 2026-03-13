import { useEffect, useState } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import type {
  BrowserEnvironmentHints,
  BrowserFlowPlan,
  TestTarget,
} from "@browser-tester/orchestrator";
import { useColors, useThemeContext } from "./theme-context.js";
import { MenuItem } from "./menu-item.js";
import { BranchSwitcherScreen } from "./branch-switcher-screen.js";
import { CommitPickerScreen } from "./commit-picker-screen.js";
import { FlowInputScreen } from "./flow-input-screen.js";
import { PlanningScreen } from "./planning-screen.js";
import { PlanReviewScreen } from "./plan-review-screen.js";
import { Spinner } from "./spinner.js";
import {
  getGitState,
  getRecommendedScope,
  type DiffStats,
  type GitState,
  type TestScope,
} from "./utils/get-git-state.js";
import { TestingScreen } from "./testing-screen.js";
import { ThemePickerScreen } from "./theme-picker-screen.js";
import { switchBranch } from "./utils/switch-branch.js";
import type { Commit } from "./utils/fetch-commits.js";
import { generateBrowserPlan, type TestAction } from "./utils/browser-agent.js";
import { saveFlow } from "./utils/save-flow.js";
import { FRAME_CONTENT_PADDING } from "./constants.js";

type Screen =
  | "main"
  | "switch-branch"
  | "select-commit"
  | "flow-input"
  | "planning"
  | "review-plan"
  | "testing"
  | "theme";

type MenuAction = "test-unstaged" | "test-branch" | "select-commit" | "select-branch";

interface ScopeMenuOption {
  label: string;
  detail: string;
  action: MenuAction;
  diffStats?: DiffStats | null;
}

const buildMenuOptions = (scope: TestScope, gitState: GitState): ScopeMenuOption[] => {
  switch (scope) {
    case "unstaged-changes": {
      const options: ScopeMenuOption[] = [
        {
          label: "Test unstaged changes",
          detail: "",
          action: "test-unstaged",
          diffStats: gitState.diffStats,
        },
      ];
      if (gitState.isOnMain) {
        options.push({ label: "Select a commit to test", detail: "", action: "select-commit" });
      } else if (gitState.hasBranchCommits) {
        options.push({
          label: "Test entire branch",
          detail: `(${gitState.currentBranch})`,
          action: "test-branch",
        });
      }
      return options;
    }
    case "select-commit":
      return [{ label: "Select a commit to test", detail: "", action: "select-commit" }];
    case "select-branch":
      return [{ label: "Select a branch to test", detail: "", action: "select-branch" }];
    case "entire-branch":
      return [
        {
          label: "Test entire branch",
          detail: `(${gitState.currentBranch})`,
          action: "test-branch",
        },
        { label: "Select a commit to test", detail: "", action: "select-commit" },
      ];
  }
};

export const App = () => {
  const { stdout } = useStdout();
  const COLORS = useColors();
  const { theme } = useThemeContext();
  const [gitState, setGitState] = useState<GitState | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [screen, setScreen] = useState<Screen>("main");
  const [testAction, setTestAction] = useState<TestAction | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [autoRunAfterPlanning, setAutoRunAfterPlanning] = useState(false);
  const [flowInstruction, setFlowInstruction] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState<BrowserFlowPlan | null>(null);
  const [resolvedTarget, setResolvedTarget] = useState<TestTarget | null>(null);
  const [browserEnvironment, setBrowserEnvironment] = useState<BrowserEnvironmentHints | null>(
    null,
  );
  const [planningError, setPlanningError] = useState<string | null>(null);

  useEffect(() => {
    const state = getGitState();
    setGitState(state);
  }, []);

  useEffect(() => {
    if (screen !== "planning" || !gitState || !testAction || !flowInstruction.trim()) return;

    let isCancelled = false;
    setPlanningError(null);

    void generateBrowserPlan({
      action: testAction,
      commit: selectedCommit ?? undefined,
      userInstruction: flowInstruction,
    })
      .then(({ target, plan, environment }) => {
        if (isCancelled) return;
        setResolvedTarget(target);
        setGeneratedPlan(plan);
        setBrowserEnvironment(environment);
        setScreen(autoRunAfterPlanning && !plan.cookieSync.required ? "testing" : "review-plan");
      })
      .catch((caughtError) => {
        if (isCancelled) return;
        const errorMessage = caughtError instanceof Error ? caughtError.message : "Unknown error";
        setPlanningError(errorMessage);
      });

    return () => {
      isCancelled = true;
    };
  }, [autoRunAfterPlanning, flowInstruction, gitState, screen, selectedCommit, testAction]);

  const recommendedScope = gitState ? getRecommendedScope(gitState) : null;
  const menuOptions =
    gitState && recommendedScope ? buildMenuOptions(recommendedScope, gitState) : [];
  useInput((input, key) => {
    if (!gitState || !recommendedScope) return;

    if (screen !== "main") {
      if (key.escape) {
        if (screen === "review-plan" || screen === "planning") {
          setScreen("flow-input");
        } else if (screen !== "testing") {
          setScreen("main");
        }
      }
      return;
    }

    if (key.downArrow || input === "j" || (key.ctrl && input === "n")) {
      setSelectedIndex((previous) => Math.min(menuOptions.length - 1, previous + 1));
    }
    if (key.upArrow || input === "k" || (key.ctrl && input === "p")) {
      setSelectedIndex((previous) => Math.max(0, previous - 1));
    }

    if (key.tab) {
      setAutoRunAfterPlanning((previous) => !previous);
    }

    if (input === "b") {
      setScreen("switch-branch");
    }

    if (input === "t") {
      setScreen("theme");
    }

    if (key.return && menuOptions.length > 0) {
      const selected = menuOptions[selectedIndex];
      if (selected.action === "select-commit") {
        setScreen("select-commit");
      } else if (selected.action === "select-branch") {
        setScreen("switch-branch");
      } else if (selected.action === "test-unstaged" || selected.action === "test-branch") {
        setTestAction(selected.action);
        setSelectedCommit(null);
        setGeneratedPlan(null);
        setResolvedTarget(null);
        setBrowserEnvironment(null);
        setScreen("flow-input");
      }
    }
  });

  const handleCommitSelect = (commit: Commit) => {
    setTestAction("select-commit");
    setSelectedCommit(commit);
    setGeneratedPlan(null);
    setResolvedTarget(null);
    setBrowserEnvironment(null);
    setScreen("flow-input");
  };

  const handleTestingExit = () => {
    setTestAction(null);
    setSelectedCommit(null);
    setFlowInstruction("");
    setGeneratedPlan(null);
    setResolvedTarget(null);
    setBrowserEnvironment(null);
    setPlanningError(null);
    setScreen("main");
  };

  const handleBranchSwitch = (branch: string) => {
    const success = switchBranch(branch);
    if (success) {
      const newState = getGitState();
      setGitState(newState);
      setSelectedIndex(0);
    }
    setScreen("main");
  };

  if (!gitState) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Spinner message="Checking git state..." />
      </Box>
    );
  }

  if (screen === "testing" && testAction) {
    if (!resolvedTarget || !generatedPlan || !browserEnvironment) {
      return (
        <Box flexDirection="column" paddingX={2} paddingY={1}>
          <Text color={COLORS.RED}>Missing execution context. Press Esc to go back.</Text>
        </Box>
      );
    }

    return (
      <TestingScreen
        target={resolvedTarget}
        plan={generatedPlan}
        environment={browserEnvironment}
        onExit={handleTestingExit}
      />
    );
  }

  if (screen === "select-commit") {
    return <CommitPickerScreen onSelect={handleCommitSelect} />;
  }

  if (screen === "theme") {
    return <ThemePickerScreen onBack={() => setScreen("main")} />;
  }

  if (screen === "switch-branch") {
    return <BranchSwitcherScreen onSelect={handleBranchSwitch} />;
  }

  if (screen === "flow-input" && testAction) {
    return (
      <FlowInputScreen
        action={testAction}
        initialValue={flowInstruction}
        onSubmit={(nextInstruction) => {
          setFlowInstruction(nextInstruction);
          setPlanningError(null);
          setGeneratedPlan(null);
          setResolvedTarget(null);
          setBrowserEnvironment(null);
          setScreen("planning");
        }}
      />
    );
  }

  if (screen === "planning") {
    return (
      <Box flexDirection="column" width="100%">
        <PlanningScreen userInstruction={flowInstruction} />
        {planningError ? (
          <Box paddingX={2}>
            <Text color={COLORS.RED}>Planning failed: {planningError}</Text>
          </Box>
        ) : null}
      </Box>
    );
  }

  if (screen === "review-plan" && generatedPlan && resolvedTarget) {
    return (
      <PlanReviewScreen
        plan={generatedPlan}
        environment={browserEnvironment ?? {}}
        onChange={setGeneratedPlan}
        onEnvironmentChange={setBrowserEnvironment}
        onSave={(plan) =>
          saveFlow({
            target: resolvedTarget,
            plan,
            environment: browserEnvironment ?? {},
          })
        }
        onApprove={(approvedPlan) => {
          setGeneratedPlan(approvedPlan);
          setScreen("testing");
        }}
      />
    );
  }

  const dots = "● ● ●";
  const titleLabel = "browser-tester";
  const actionsLine = " Actions";

  const getMenuItemMaxWidth = (option: ScopeMenuOption, index: number): number => {
    let width = 2;
    width += option.label.length;
    if (option.diffStats) {
      width += ` +${option.diffStats.additions} -${option.diffStats.deletions}`.length;
    } else if (option.detail) {
      width += ` ${option.detail}`.length;
    }
    if (index === 0 && menuOptions.length > 1) {
      width += " (recommended)".length;
    }
    if (menuOptions.length === 1) {
      width += " (press return)".length;
    }
    return width;
  };

  const getMenuItemRenderedWidth = (option: ScopeMenuOption, index: number): number => {
    const isSelected = index === selectedIndex;
    let width = 2;
    width += option.label.length;
    if (isSelected && option.diffStats) {
      width += ` +${option.diffStats.additions} -${option.diffStats.deletions}`.length;
    } else if (option.detail) {
      width += ` ${option.detail}`.length;
    }
    if (isSelected && index === 0 && menuOptions.length > 1) {
      width += " (recommended)".length;
    }
    if (menuOptions.length === 1 && isSelected) {
      width += " (press return)".length;
    }
    return width;
  };

  const optionsLine = " Options";
  const autoRunLine = `  auto-run after planning (⇥ tab): ${autoRunAfterPlanning ? "yes" : "no"}`;

  const inner =
    Math.max(
      titleLabel.length + 4,
      actionsLine.length,
      optionsLine.length,
      autoRunLine.length,
      dots.length + 1,
      ...menuOptions.map((option, index) => getMenuItemMaxWidth(option, index)),
    ) + FRAME_CONTENT_PADDING;
  const pad = (content: string) => " ".repeat(Math.max(0, inner - content.length));
  const emptyRow = (
    <Text color={COLORS.DIM}>
      {"│"}
      {" ".repeat(inner)}
      {"│"}
    </Text>
  );

  return (
    <Box flexDirection="column" width="100%" paddingX={1} paddingY={1}>
      <Text color={COLORS.DIM}>
        {"╭"}
        {"─".repeat(Math.floor((inner - titleLabel.length - 4) / 2))}
        {"·"}
        {" "}
        <Text bold color={COLORS.TEXT || undefined}>
          {titleLabel}
        </Text>
        <Text color={COLORS.DIM}>
          {" "}
          {"·"}
          {"─".repeat(Math.ceil((inner - titleLabel.length - 4) / 2))}
        </Text>
        {"╮"}
      </Text>
      <Text color={COLORS.DIM}>
        {"│ "}
        <Text color="#ff5f57">{"● "}</Text>
        <Text color="#febc2e">{"● "}</Text>
        <Text color="#28c840">{"●"}</Text>
        {" ".repeat(inner - dots.length - 1)}
        {"│"}
      </Text>
      {emptyRow}
      <Text color={COLORS.DIM}>
        {"│ "}
        <Text bold color={COLORS.TEXT || undefined}>
          Actions
        </Text>
        {pad(" Actions")}
        {"│"}
      </Text>
      {menuOptions.map((option, index) => {
        const itemWidth = getMenuItemRenderedWidth(option, index);
        return (
          <Box key={option.label}>
            <Text color={COLORS.DIM}>{"│"}</Text>
            <MenuItem
              label={option.label}
              detail={option.detail}
              isSelected={index === selectedIndex}
              recommended={index === 0 && menuOptions.length > 1}
              hint={
                menuOptions.length === 1 && index === selectedIndex ? "press return" : undefined
              }
              diffStats={option.diffStats}
            />
            <Text color={COLORS.DIM}>
              {" ".repeat(Math.max(0, inner - itemWidth))}
              {"│"}
            </Text>
          </Box>
        );
      })}
      {emptyRow}
      {emptyRow}
      <Text color={COLORS.DIM}>
        {"│ "}
        <Text bold color={COLORS.TEXT || undefined}>
          Options
        </Text>
        {pad(optionsLine)}
        {"│"}
      </Text>
      <Text color={COLORS.DIM}>
        {"│  "}
        <Text color={COLORS.DIM}>
          auto-run after planning (<Text color={COLORS.TEXT || undefined}>⇥ tab</Text>):{" "}
          <Text color={autoRunAfterPlanning ? COLORS.ORANGE : COLORS.DIM}>
            {autoRunAfterPlanning ? "yes" : "no"}
          </Text>
        </Text>
        {pad(autoRunLine)}
        {"│"}
      </Text>
      {emptyRow}
      <Text color={COLORS.DIM}>
        {"╰"}
        {"─".repeat(inner)}
        {"╯"}
      </Text>

      <Box marginTop={1}>
        <Text backgroundColor={theme.primary} color="#000000" bold>
          {" "}
          {gitState.currentBranch}{" "}
        </Text>
        <Text backgroundColor={theme.border} color={theme.text}>
          {` t theme · b branch · ↑↓ nav`.padEnd(stdout.columns - 2 - gitState.currentBranch.length - 3)}
        </Text>
      </Box>
    </Box>
  );
};
