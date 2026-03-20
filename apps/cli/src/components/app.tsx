import { useState } from "react";
import { Box, useInput } from "ink";
import { MouseProvider } from "../hooks/mouse-context";
import { PrPickerScreen } from "./screens/pr-picker-screen";
import { CookieSyncConfirmScreen } from "./screens/cookie-sync-confirm-screen";
import { SavedFlowPickerScreen } from "./screens/saved-flow-picker-screen";
import { Spinner } from "./ui/spinner";
import { TestingScreen } from "./screens/testing-screen";
import { ResultsScreen } from "./screens/results-screen";
import { ThemePickerScreen } from "./screens/theme-picker-screen";
import { MainMenu } from "./screens/main-menu-screen";
import { Modeline } from "./ui/modeline";
import { useNavigationStore } from "../stores/use-navigation";
import { useFlowSessionStore } from "../stores/use-flow-session";
import { useGitState } from "../hooks/use-git-state";
import { clearInkDisplay } from "../utils/clear-ink-display";
import { useStdoutDimensions } from "../hooks/use-stdout-dimensions";

export const App = () => {
  const screen = useNavigationStore((state) => state.screen);
  const { data: gitState, isLoading: gitStateLoading } = useGitState();
  const goBack = useFlowSessionStore((state) => state.goBack);
  const navigateTo = useNavigationStore((state) => state.navigateTo);

  const [, setRefreshTick] = useState(0);
  const [, rows] = useStdoutDimensions();

  useInput((input, key) => {
    if (key.ctrl && input === "l") {
      clearInkDisplay();
      setRefreshTick((previous) => previous + 1);
      return;
    }
    if (key.escape && screen !== "main") {
      goBack();
    }
    if (key.ctrl && input === "p" && screen === "main" && gitState?.isGitRepo) {
      navigateTo("select-pr");
    }
    if (key.ctrl && input === "r" && screen === "main") {
      navigateTo("saved-flow-picker");
    }
    if (key.ctrl && input === "t") {
      navigateTo("theme");
    }
  });

  if (gitStateLoading || !gitState) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Spinner message="Checking git state..." />
      </Box>
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case "testing":
        return <TestingScreen />;
      case "results":
        return <ResultsScreen />;
      case "theme":
        return <ThemePickerScreen />;
      case "select-pr":
        return <PrPickerScreen />;
      case "saved-flow-picker":
        return <SavedFlowPickerScreen />;
      case "cookie-sync-confirm":
        return <CookieSyncConfirmScreen />;
      default:
        return <MainMenu />;
    }
  };

  return (
    <MouseProvider>
      <Box flexDirection="column" width="100%" height={rows}>
        <Box flexGrow={1}>{renderScreen()}</Box>
        <Modeline />
      </Box>
    </MouseProvider>
  );
};
