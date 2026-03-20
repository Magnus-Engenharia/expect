import { useState } from "react";
import { Box, Text, useInput } from "ink";
import figures from "figures";
import { loadFlow, removeFlow } from "@browser-tester/supervisor";
import { SAVED_FLOW_PICKER_VISIBLE_COUNT } from "../../constants";
import { useSavedFlows, EMPTY_SAVED_FLOWS } from "../../hooks/use-saved-flows";
import { useScrollableList } from "../../hooks/use-scrollable-list";
import { queryClient } from "../../query-client";
import { useFlowSessionStore } from "../../stores/use-flow-session";
import { formatTimeAgo } from "../../utils/format-time-ago";
import { useColors } from "../theme-context";
import { Clickable } from "../ui/clickable";
import { ErrorMessage } from "../ui/error-message";
import { RuledBox } from "../ui/ruled-box";
import { ScreenHeading } from "../ui/screen-heading";
import { Spinner } from "../ui/spinner";

const ACTION_LABELS: Record<string, string> = {
  "test-unstaged": "Test current changes",
  "test-branch": "Test entire branch",
  "test-changes": "Test changes from main",
  "select-commit": "Test commit",
};

export const SavedFlowPickerScreen = () => {
  const COLORS = useColors();
  const testAction = useFlowSessionStore((state) => state.testAction);
  const applySavedFlow = useFlowSessionStore((state) => state.applySavedFlow);
  const { data: savedFlowSummaries = EMPTY_SAVED_FLOWS, isLoading } = useSavedFlows();
  const [loadingFilePath, setLoadingFilePath] = useState<string | null>(null);
  const [deletingFilePath, setDeletingFilePath] = useState<string | null>(null);
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { highlightedIndex, setHighlightedIndex, scrollOffset, handleNavigation } =
    useScrollableList({
      itemCount: savedFlowSummaries.length,
      visibleCount: SAVED_FLOW_PICKER_VISIBLE_COUNT,
    });

  const selectedFlow = savedFlowSummaries[highlightedIndex] ?? null;
  const visibleSavedFlows = savedFlowSummaries.slice(
    scrollOffset,
    scrollOffset + SAVED_FLOW_PICKER_VISIBLE_COUNT,
  );
  const actionInProgress = Boolean(loadingFilePath || deletingFilePath);

  const handleLoadSelectedFlow = (index: number) => {
    if (actionInProgress || deleteConfirmationVisible) {
      return;
    }

    const savedFlowSummary = savedFlowSummaries[index];
    if (!savedFlowSummary) {
      return;
    }

    setHighlightedIndex(index);
    setErrorMessage(null);
    setLoadingFilePath(savedFlowSummary.filePath);
    void loadFlow(savedFlowSummary.filePath)
      .then((loadedFlow) => {
        applySavedFlow(loadedFlow);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load saved flow.");
      })
      .finally(() => {
        setLoadingFilePath(null);
      });
  };

  const handleDeleteSelectedFlow = () => {
    if (!selectedFlow || actionInProgress) {
      return;
    }

    setDeleteConfirmationVisible(false);
    setErrorMessage(null);
    setDeletingFilePath(selectedFlow.filePath);
    void removeFlow(selectedFlow.filePath)
      .then(() => queryClient.invalidateQueries({ queryKey: ["saved-flows"] }))
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Failed to remove saved flow.");
      })
      .finally(() => {
        setDeletingFilePath(null);
      });
  };

  useInput((input, key) => {
    const normalizedInput = input.toLowerCase();

    if (deleteConfirmationVisible) {
      if (key.return) {
        handleDeleteSelectedFlow();
      }

      if (normalizedInput === "n") {
        setDeleteConfirmationVisible(false);
      }

      return;
    }

    if (actionInProgress || savedFlowSummaries.length === 0) {
      return;
    }

    if (handleNavigation(input, key)) {
      return;
    }

    if (key.return) {
      handleLoadSelectedFlow(highlightedIndex);
    }

    if (normalizedInput === "d") {
      setErrorMessage(null);
      setDeleteConfirmationVisible(true);
    }
  });

  return (
    <Box flexDirection="column" width="100%" paddingY={1}>
      <Box paddingX={1}>
        <ScreenHeading
          title="Reuse saved flow"
          subtitle={testAction ? ACTION_LABELS[testAction] : "Load a previously saved flow"}
        />
      </Box>

      {isLoading ? (
        <Box marginTop={1} paddingX={1}>
          <Spinner message="Loading saved flows..." />
        </Box>
      ) : (
        <Box
          flexDirection="column"
          marginTop={1}
          height={SAVED_FLOW_PICKER_VISIBLE_COUNT}
          overflow="hidden"
          paddingX={1}
        >
          {visibleSavedFlows.map((savedFlow, index) => {
            const actualIndex = index + scrollOffset;
            const isSelected = actualIndex === highlightedIndex;
            const isLoadingFlow = loadingFilePath === savedFlow.filePath;
            const isDeletingFlow = deletingFilePath === savedFlow.filePath;
            const actionSuffix = isLoadingFlow
              ? " (loading...)"
              : isDeletingFlow
                ? " (removing...)"
                : "";

            return (
              <Clickable
                key={savedFlow.filePath}
                onClick={() => handleLoadSelectedFlow(actualIndex)}
              >
                <Box flexDirection="column" marginBottom={1}>
                  <Text>
                    <Text color={isSelected ? COLORS.PRIMARY : COLORS.DIM}>
                      {isSelected ? `${figures.pointer} ` : "  "}
                    </Text>
                    {isSelected ? (
                      <Text color={COLORS.PRIMARY} bold>
                        {savedFlow.title}
                      </Text>
                    ) : (
                      <Text color={COLORS.TEXT}>{savedFlow.title}</Text>
                    )}
                    <Text color={COLORS.DIM}>{" · updated "}</Text>
                    <Text color={COLORS.DIM}>{formatTimeAgo(savedFlow.modifiedAtMs)}</Text>
                    {actionSuffix ? <Text color={COLORS.DIM}>{actionSuffix}</Text> : null}
                  </Text>
                  <Text color={COLORS.DIM}>
                    {"  "}
                    {savedFlow.description}
                    {savedFlow.savedTargetDisplayName
                      ? ` · saved for ${savedFlow.savedTargetDisplayName}`
                      : ""}
                  </Text>
                </Box>
              </Clickable>
            );
          })}
          {savedFlowSummaries.length === 0 ? (
            <Text color={COLORS.DIM}>No saved flows available yet.</Text>
          ) : null}
        </Box>
      )}

      {deleteConfirmationVisible && selectedFlow ? (
        <RuledBox color={COLORS.YELLOW} marginTop={1}>
          <Text color={COLORS.YELLOW} bold>
            Remove saved flow?
          </Text>
          <Text color={COLORS.DIM}>
            Press <Text color={COLORS.PRIMARY}>Enter</Text> to remove{" "}
            <Text color={COLORS.TEXT}>{selectedFlow.title}</Text> or{" "}
            <Text color={COLORS.PRIMARY}>n</Text> to cancel.
          </Text>
        </RuledBox>
      ) : savedFlowSummaries.length > 0 ? (
        <Box marginTop={1} paddingX={1}>
          <Text color={COLORS.DIM}>
            Press <Text color={COLORS.PRIMARY}>Enter</Text> to load or{" "}
            <Text color={COLORS.PRIMARY}>d</Text> to remove the selected flow.
          </Text>
        </Box>
      ) : null}

      <Box paddingX={1}>
        <ErrorMessage message={errorMessage} />
      </Box>
    </Box>
  );
};
