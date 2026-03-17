import { useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";
import figures from "figures";
import { Spinner } from "../ui/spinner.js";
import { useColors } from "../theme-context.js";
import { RuledBox } from "../ui/ruled-box.js";
import { DotField } from "../ui/dot-field.js";
import { useAppStore } from "../../store.js";
import { useStdoutDimensions } from "../../hooks/use-stdout-dimensions.js";
import { formatElapsedTime } from "../../utils/format-elapsed-time.js";
import { TESTING_TIMER_UPDATE_INTERVAL_MS } from "../../constants.js";

const TIPS = [
  "Use @ in the input to target a specific PR, branch, or commit",
  "Press shift+tab to toggle auto-run after planning",
  "You can edit step instructions during plan review with e",
  "Save plans with s to reuse them later with ctrl+r",
  "Use tab to accept a suggested test prompt",
  "Arrow keys cycle through test suggestions on the home screen",
  "Plans adapt to your diff — smaller changes mean faster plans",
  "You can switch context to a different branch during plan review",
  "Cookie sync lets the browser inherit your authenticated sessions",
  "Press ctrl+p to quickly switch to a different PR",
] as const;

const MAX_VISIBLE_LINES = 8;

export const PlanningScreen = () => {
  const COLORS = useColors();
  const [columns] = useStdoutDimensions();
  const flowInstruction = useAppStore((state) => state.flowInstruction);
  const thinkingLines = useAppStore((state) => state.planningThinkingLines);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [tipIndex] = useState(() => Math.floor(Math.random() * TIPS.length));
  const thinkingBufferRef = useRef("");
  const [displayLines, setDisplayLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, TESTING_TIMER_UPDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => {
    const fullText = thinkingLines.join("");
    const newText = fullText.slice(thinkingBufferRef.current.length);
    thinkingBufferRef.current = fullText;

    if (!newText) return;

    const parts = newText.split("\n");
    if (parts.length === 1) {
      setCurrentLine((previous) => previous + parts[0]);
    } else {
      setCurrentLine((previous) => {
        const firstComplete = previous + parts[0];
        const middleLines = parts.slice(1, -1);
        setDisplayLines((previousLines) => [...previousLines, firstComplete, ...middleLines]);
        return parts[parts.length - 1];
      });
    }
  }, [thinkingLines]);

  const visibleLines = displayLines.slice(-MAX_VISIBLE_LINES);
  const hasThinking = displayLines.length > 0 || currentLine.length > 0;

  return (
    <Box flexDirection="column" width="100%" paddingY={1}>
      <DotField rows={3} dimColor="#1a1a1a" brightColor={COLORS.BORDER} />

      <RuledBox color={COLORS.BORDER}>
        <Text color={COLORS.DIM}>{flowInstruction}</Text>
      </RuledBox>

      <Box marginTop={1} paddingX={1} justifyContent="space-between">
        <Box>
          <Spinner />
          <Text color={COLORS.DIM}>
            {` Generating plan${figures.ellipsis} `}
            <Text color={COLORS.BORDER}>{formatElapsedTime(elapsed)}</Text>
          </Text>
        </Box>
        <Text color={COLORS.BORDER}>
          {"TIP "}<Text color={COLORS.DIM}>{TIPS[tipIndex]}</Text>
        </Text>
      </Box>

      {hasThinking ? (
        <Box paddingX={1} marginTop={1} flexDirection="column">
          {visibleLines.map((line, index) => (
            <Text key={index} color={COLORS.BORDER}>
              {"│ "}<Text color={COLORS.DIM}>{line}</Text>
            </Text>
          ))}
          <Text color={COLORS.BORDER}>
            {"│ "}<Text color={COLORS.DIM}>{currentLine}<Text color={COLORS.BORDER}>▌</Text></Text>
          </Text>
        </Box>
      ) : null}
    </Box>
  );
};
