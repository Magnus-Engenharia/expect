import { useCallback, useState } from "react";
import { Box, Text, useInput } from "ink";
import figures from "figures";
import stringWidth from "string-width";
import { useColors } from "./theme-context.js";
import { Clickable } from "./ui/clickable.js";
import { MenuItem } from "./ui/menu-item.js";
import type { DiffStats } from "@browser-tester/supervisor";
import { getRecommendedScope, type GitState, type TestScope } from "../utils/get-git-state.js";
import {
  FRAME_CONTENT_PADDING,
  FRAME_DOTS_TRAILING_GAP,
  FRAME_TITLE_DECORATION_WIDTH,
  MENU_ITEM_PREFIX_WIDTH,
} from "../constants.js";
import { useAppStore } from "../store.js";

type MenuAction = "test-unstaged" | "test-branch" | "select-commit";

interface ScopeMenuOption {
  label: string;
  detail: string;
  action: MenuAction;
  diffStats?: DiffStats | null;
}

const buildMenuOptions = (scope: TestScope, gitState: GitState): ScopeMenuOption[] => {
  const options: ScopeMenuOption[] = [];

  if (scope === "unstaged-changes") {
    options.push({
      label: "Test unstaged changes",
      detail: "",
      action: "test-unstaged",
      diffStats: gitState.diffStats,
    });
  }

  if (scope === "entire-branch" || (scope === "unstaged-changes" && !gitState.isOnMain && gitState.hasBranchCommits)) {
    options.push({
      label: "Test entire branch",
      detail: `(${gitState.currentBranch})`,
      action: "test-branch",
    });
  }

  options.push({ label: "Select a commit to test", detail: "", action: "select-commit" });

  return options;
};

export const MainMenu = () => {
  const COLORS = useColors();
  const gitState = useAppStore((state) => state.gitState);
  const autoRunAfterPlanning = useAppStore((state) => state.autoRunAfterPlanning);
  const savedFlowSummaries = useAppStore((state) => state.savedFlowSummaries);
  const selectAction = useAppStore((state) => state.selectAction);
  const beginSavedFlowReuse = useAppStore((state) => state.beginSavedFlowReuse);
  const navigateTo = useAppStore((state) => state.navigateTo);
  const toggleAutoRun = useAppStore((state) => state.toggleAutoRun);
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!gitState) return null;

  const recommendedScope = getRecommendedScope(gitState);
  const menuOptions = buildMenuOptions(recommendedScope, gitState);
  const selectedOption = menuOptions[selectedIndex] ?? null;
  const canReuseSavedFlow = savedFlowSummaries.length > 0 && Boolean(selectedOption);

  const activateOption = useCallback(
    (option: ScopeMenuOption) => {
      if (option.action === "select-commit") {
        navigateTo("select-commit");
      } else {
        selectAction(option.action);
      }
    },
    [navigateTo, selectAction],
  );

  useInput((input, key) => {
    if (key.downArrow || input === "j" || (key.ctrl && input === "n")) {
      setSelectedIndex((previous) => Math.min(menuOptions.length - 1, previous + 1));
    }
    if (key.upArrow || input === "k" || (key.ctrl && input === "p")) {
      setSelectedIndex((previous) => Math.max(0, previous - 1));
    }

    if (key.tab) {
      toggleAutoRun();
    }

    if (input === "b") {
      navigateTo("switch-branch");
    }

    if (input === "r" && canReuseSavedFlow && selectedOption) {
      if (selectedOption.action === "test-unstaged" || selectedOption.action === "test-branch") {
        beginSavedFlowReuse(selectedOption.action);
      }

      if (selectedOption.action === "select-commit") {
        beginSavedFlowReuse("select-commit");
      }
    }

    if (key.return && menuOptions.length > 0) {
      activateOption(menuOptions[selectedIndex]);
    }
  });

  const getMenuItemMaxWidth = (option: ScopeMenuOption, index: number): number => {
    let width = MENU_ITEM_PREFIX_WIDTH;
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
    let width = MENU_ITEM_PREFIX_WIDTH;
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

  const dots = `${figures.circleFilled} ${figures.circleFilled} ${figures.circleFilled}`;
  const titleLabel = "browser-tester";
  const actionsLine = " Actions";
  const optionsLine = " Options";
  const autoRunLine = `  auto-run after planning (⇥ tab): ${autoRunAfterPlanning ? "yes" : "no"}`;

  const inner =
    Math.max(
      titleLabel.length + FRAME_TITLE_DECORATION_WIDTH,
      actionsLine.length,
      optionsLine.length,
      autoRunLine.length,
      stringWidth(dots) + FRAME_DOTS_TRAILING_GAP,
      ...menuOptions.map((option, index) => getMenuItemMaxWidth(option, index)),
    ) + FRAME_CONTENT_PADDING;
  const padToInnerWidth = (content: string) => " ".repeat(Math.max(0, inner - content.length));
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
        {"─".repeat(Math.floor((inner - titleLabel.length - FRAME_TITLE_DECORATION_WIDTH) / 2))}
        {"·"}{" "}
        <Text bold color={COLORS.TEXT}>
          {titleLabel}
        </Text>
        <Text color={COLORS.DIM}>
          {" "}
          {"·"}
          {"─".repeat(Math.ceil((inner - titleLabel.length - FRAME_TITLE_DECORATION_WIDTH) / 2))}
        </Text>
        {"╮"}
      </Text>
      <Text color={COLORS.DIM}>
        {"│ "}
        <Text color="#ff5f57">{`${figures.circleFilled} `}</Text>
        <Text color="#febc2e">{`${figures.circleFilled} `}</Text>
        <Text color="#28c840">{figures.circleFilled}</Text>
        {" ".repeat(inner - stringWidth(dots) - FRAME_DOTS_TRAILING_GAP)}
        {"│"}
      </Text>
      {emptyRow}
      <Text color={COLORS.DIM}>
        {"│ "}
        <Text bold color={COLORS.TEXT}>
          Actions
        </Text>
        {padToInnerWidth(" Actions")}
        {"│"}
      </Text>
      {menuOptions.map((option, index) => {
        const itemWidth = getMenuItemRenderedWidth(option, index);
        return (
          <Clickable key={option.label} onClick={() => activateOption(option)}>
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
          </Clickable>
        );
      })}
      {emptyRow}
      {emptyRow}
      <Text color={COLORS.DIM}>
        {"│ "}
        <Text bold color={COLORS.TEXT}>
          Options
        </Text>
        {padToInnerWidth(optionsLine)}
        {"│"}
      </Text>
      <Clickable onClick={toggleAutoRun}>
        <Text color={COLORS.DIM}>{"│  "}</Text>
        <Text color={autoRunAfterPlanning ? COLORS.TEXT : COLORS.DIM} bold={autoRunAfterPlanning}>
          auto-run after planning (<Text color={COLORS.TEXT}>⇥ tab</Text>):{" "}
          <Text
            color={autoRunAfterPlanning ? COLORS.GREEN : COLORS.DIM}
            bold={autoRunAfterPlanning}
          >
            {autoRunAfterPlanning ? "yes" : "no"}
          </Text>
        </Text>
        <Text color={COLORS.DIM}>
          {padToInnerWidth(autoRunLine)}
          {"│"}
        </Text>
      </Clickable>
      {emptyRow}
      <Text color={COLORS.DIM}>
        {"╰"}
        {"─".repeat(inner)}
        {"╯"}
      </Text>
    </Box>
  );
};
