import { create } from "zustand";
import {
  appendPrompt,
  checkoutBranch,
  generateFlow,
  getBrowserEnvironment,
  loadPromptHistory,
  resolveBrowserTarget,
  saveFlow,
  type AgentProvider,
  type BrowserEnvironmentHints,
  type BrowserRunEvent,
  type BrowserRunReport,
  type CommitSummary,
  type SavedFlow,
  type SavedFlowFileData,
  type TestAction,
  type TestTarget,
} from "@browser-tester/supervisor";
import { FLOW_INPUT_HISTORY_LIMIT } from "../constants";
import type { ContextOption } from "../utils/context-options";
import { useNavigationStore } from "./use-navigation";
import { usePreferencesStore } from "./use-preferences";
import { queryClient } from "../query-client";

interface FlowSessionStore {
  testAction: TestAction | null;
  selectedCommit: CommitSummary | null;
  flowInstruction: string;
  flowInstructionHistory: string[];
  resolvedTarget: TestTarget | null;
  browserEnvironment: BrowserEnvironmentHints | null;
  resolvedExecutionProvider: AgentProvider | null;
  latestRunReport: BrowserRunReport | null;
  latestRunEvents: BrowserRunEvent[];
  liveViewUrl: string | null;
  flowSaveStatus: "idle" | "generating" | "saved" | "error";
  savedFlowPath: string | null;
  flowSaveError: string | null;
  pendingSavedFlow: SavedFlow | null;
  selectedContext: ContextOption | null;
  checkedOutBranch: string | null;
  checkedOutPrNumber: number | null;
  checkoutError: string | null;
  selectContext: (context: ContextOption | null) => void;
  setLiveViewUrl: (url: string | null) => void;
  goBack: () => void;
  selectAction: (action: TestAction) => void;
  selectCommit: (commit: CommitSummary) => void;
  submitFlowInstruction: (instruction: string) => void;
  updateEnvironment: (environment: BrowserEnvironmentHints | null) => void;
  startTesting: () => void;
  setFlowSaveStatus: (
    status: "idle" | "generating" | "saved" | "error",
    savedFlowPath?: string | null,
    flowSaveError?: string | null,
  ) => void;
  saveCurrentFlow: () => Promise<void>;
  applySavedFlow: (flow: SavedFlowFileData) => void;
  completeTestingRun: (report: BrowserRunReport, events: BrowserRunEvent[]) => void;
  exitTesting: () => void;
  switchBranch: (branch: string, prNumber?: number | null) => void;
  clearCheckoutError: () => void;
  hydrateHistory: () => void;
}

const COOKIE_SYNC_KEYWORDS = [
  "login",
  "log in",
  "sign in",
  "signup",
  "sign up",
  "account",
  "dashboard",
  "profile",
  "settings",
  "billing",
  "workspace",
  "organization",
  "admin",
  "project",
];

const shouldConfirmCookieSync = (
  instruction: string,
  environment: BrowserEnvironmentHints | null,
): boolean => {
  if (environment?.cookies === true) return false;
  const normalizedInstruction = instruction.toLowerCase();
  return COOKIE_SYNC_KEYWORDS.some((keyword) => normalizedInstruction.includes(keyword));
};

const getTestActionForSavedFlowScope = (
  scope: SavedFlowFileData["savedTargetScope"],
): TestAction => {
  switch (scope) {
    case "unstaged":
      return "test-unstaged";
    case "branch":
      return "test-branch";
    case "commit":
      return "select-commit";
    default:
      return "test-changes";
  }
};

const RESET_RUN_STATE = {
  resolvedTarget: null,
  browserEnvironment: null,
  resolvedExecutionProvider: null,
  latestRunReport: null,
  latestRunEvents: [],
  liveViewUrl: null,
  flowSaveStatus: "idle" as const,
  savedFlowPath: null,
  flowSaveError: null,
  pendingSavedFlow: null,
};

const RESET_FLOW_STATE = {
  ...RESET_RUN_STATE,
  testAction: null,
  selectedCommit: null,
  selectedContext: null,
  flowInstruction: "",
};

const rememberFlowInstruction = (history: string[], instruction: string): string[] => {
  if (!instruction) return history;
  appendPrompt(instruction).catch(() => {});
  return [instruction, ...history.filter((entry) => entry !== instruction)].slice(
    0,
    FLOW_INPUT_HISTORY_LIMIT,
  );
};

const setScreen = useNavigationStore.getState().setScreen;

export const useFlowSessionStore = create<FlowSessionStore>((set, get) => ({
  testAction: null,
  selectedCommit: null,
  flowInstruction: "",
  flowInstructionHistory: [],
  resolvedTarget: null,
  browserEnvironment: null,
  resolvedExecutionProvider: null,
  latestRunReport: null,
  latestRunEvents: [],
  liveViewUrl: null,
  flowSaveStatus: "idle",
  savedFlowPath: null,
  flowSaveError: null,
  pendingSavedFlow: null,
  selectedContext: null,
  checkedOutBranch: null,
  checkedOutPrNumber: null,
  checkoutError: null,

  selectContext: (context) => set({ selectedContext: context }),
  setLiveViewUrl: (url) => set({ liveViewUrl: url }),

  goBack: () => {
    const { screen } = useNavigationStore.getState();

    if (screen === "cookie-sync-confirm") {
      setScreen("main");
      return;
    }

    if (screen === "results") {
      set(RESET_FLOW_STATE);
      setScreen("main");
      return;
    }

    if (screen !== "testing") {
      setScreen("main");
    }
  },

  selectAction: (action) => {
    set({
      ...RESET_RUN_STATE,
      testAction: action,
      selectedCommit: null,
    });
    setScreen("main");
  },

  selectCommit: (commit) => {
    set({
      ...RESET_RUN_STATE,
      testAction: "select-commit",
      selectedCommit: commit,
    });
    setScreen("main");
  },

  submitFlowInstruction: (instruction) => {
    const state = get();
    const { environmentOverrides } = usePreferencesStore.getState();
    const flowInstructionHistory = rememberFlowInstruction(
      state.flowInstructionHistory,
      instruction,
    );

    if (!state.testAction) {
      set({
        ...RESET_RUN_STATE,
        flowInstruction: instruction,
        flowInstructionHistory,
      });
      setScreen("main");
      return;
    }

    const resolvedTarget = resolveBrowserTarget({
      action: state.testAction,
      commit: state.selectedCommit ?? undefined,
    });
    const browserEnvironment = getBrowserEnvironment(environmentOverrides);

    set({
      ...RESET_RUN_STATE,
      testAction: state.testAction,
      selectedCommit: state.selectedCommit,
      flowInstruction: instruction,
      flowInstructionHistory,
      resolvedTarget,
      browserEnvironment,
    });

    setScreen(
      shouldConfirmCookieSync(instruction, browserEnvironment) ? "cookie-sync-confirm" : "testing",
    );
  },

  updateEnvironment: (environment) => set({ browserEnvironment: environment }),

  startTesting: () => {
    setScreen("testing");
  },

  setFlowSaveStatus: (flowSaveStatus, savedFlowPath = null, flowSaveError = null) => {
    set({ flowSaveStatus, savedFlowPath, flowSaveError });
  },

  saveCurrentFlow: async () => {
    const state = get();
    if (
      state.flowSaveStatus === "generating" ||
      !state.latestRunReport ||
      !state.resolvedTarget ||
      !state.flowInstruction
    ) {
      return;
    }

    set({
      flowSaveStatus: "generating",
      savedFlowPath: null,
      flowSaveError: null,
    });

    try {
      const generatedFlow = await generateFlow({
        cwd: state.resolvedTarget.cwd,
        events: state.latestRunEvents,
        report: state.latestRunReport,
        userInstruction: state.flowInstruction,
        target: state.resolvedTarget,
      });
      const savedFlowPath = await saveFlow({
        cwd: state.resolvedTarget.cwd,
        title: generatedFlow.title,
        description: state.latestRunReport.summary,
        flow: {
          title: generatedFlow.title,
          userInstruction: state.flowInstruction,
          steps: generatedFlow.steps,
        },
        environment: state.browserEnvironment ?? {},
        target: state.resolvedTarget,
      });

      set({
        flowSaveStatus: "saved",
        savedFlowPath,
        flowSaveError: null,
      });
      void queryClient.invalidateQueries({ queryKey: ["saved-flows"] });
    } catch (error) {
      set({
        flowSaveStatus: "error",
        savedFlowPath: null,
        flowSaveError: error instanceof Error ? error.message : String(error),
      });
    }
  },

  applySavedFlow: (savedFlowFile) => {
    const { environmentOverrides } = usePreferencesStore.getState();
    const testAction = getTestActionForSavedFlowScope(savedFlowFile.savedTargetScope);
    const selectedCommit = savedFlowFile.selectedCommit ?? null;
    const resolvedTarget = resolveBrowserTarget({
      action: testAction,
      commit: selectedCommit ?? undefined,
    });
    set({
      ...RESET_FLOW_STATE,
      testAction,
      selectedCommit,
      flowInstruction: savedFlowFile.flow.userInstruction,
      resolvedTarget,
      browserEnvironment: getBrowserEnvironment({
        ...savedFlowFile.environment,
        ...environmentOverrides,
      }),
      pendingSavedFlow: savedFlowFile.flow,
    });
    setScreen("testing");
  },

  completeTestingRun: (report, events) => {
    set({
      latestRunReport: report,
      latestRunEvents: events,
      flowSaveStatus: "idle",
      savedFlowPath: null,
      flowSaveError: null,
    });
    setScreen("results");
  },

  exitTesting: () => {
    set(RESET_FLOW_STATE);
    setScreen("main");
  },

  switchBranch: (branch, prNumber) => {
    const success = checkoutBranch(process.cwd(), branch);
    if (success) {
      set({
        ...RESET_RUN_STATE,
        testAction: "test-branch",
        checkedOutBranch: branch,
        checkedOutPrNumber: prNumber ?? null,
        checkoutError: null,
        selectedCommit: null,
      });
      void queryClient.invalidateQueries({ queryKey: ["git-state"] });
      setScreen("main");
      return;
    }

    set({
      checkoutError: `Could not checkout "${branch}". You may have uncommitted changes or the branch may not exist locally.`,
    });
  },

  clearCheckoutError: () => set({ checkoutError: null }),

  hydrateHistory: () => {
    loadPromptHistory()
      .then((history: string[]) =>
        set({ flowInstructionHistory: history.slice(0, FLOW_INPUT_HISTORY_LIMIT) }),
      )
      .catch(() => {});
  },
}));

useFlowSessionStore.getState().hydrateHistory();
