import { useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";
import { COLORS } from "./constants.js";

const RESOLVE_MS = 30;
const SHIMMER_INTERVAL_MS = 40;
const THINKING_CHARS = ["◇", "◆", "◇", "◆"];

type Result = "pass" | "fail" | "skip";
type SlotState = "idle" | "thinking" | "resolved";

const GRID_COLUMNS = 3;
const RESULTS: Result[] = [
  "pass", "pass", "fail",
  "pass", "skip", "pass",
];

const THINK_DURATION_MS: Record<Result, number> = {
  pass: 100,
  fail: 220,
  skip: 60,
};

const RESULT_ICON: Record<Result, string> = {
  pass: "✓",
  fail: "✗",
  skip: "–",
};

const RESULT_COLOR: Record<Result, string> = {
  pass: COLORS.GREEN,
  fail: COLORS.RED,
  skip: COLORS.YELLOW,
};

export const ColoredLogo = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [slotState, setSlotState] = useState<SlotState>("thinking");
  const [shimmerFrame, setShimmerFrame] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (activeIndex >= RESULTS.length) {
      doneRef.current = true;
      return;
    }
    if (slotState !== "thinking") return;

    const timer = setInterval(() => {
      setShimmerFrame((previous) => (previous + 1) % THINKING_CHARS.length);
    }, SHIMMER_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [activeIndex, slotState]);

  useEffect(() => {
    if (activeIndex >= RESULTS.length) return;

    if (slotState === "thinking") {
      const base = THINK_DURATION_MS[RESULTS[activeIndex]];
      const jitter = base * 0.4 * (Math.random() - 0.5);
      const timer = setTimeout(() => setSlotState("resolved"), base + jitter);
      return () => clearTimeout(timer);
    }

    if (slotState === "resolved") {
      const timer = setTimeout(() => {
        setActiveIndex((previous) => previous + 1);
        setSlotState("thinking");
        setShimmerFrame(0);
      }, RESOLVE_MS);
      return () => clearTimeout(timer);
    }
  }, [activeIndex, slotState]);

  const rows = Array.from({ length: Math.ceil(RESULTS.length / GRID_COLUMNS) }, (_, rowIndex) =>
    RESULTS.slice(rowIndex * GRID_COLUMNS, (rowIndex + 1) * GRID_COLUMNS),
  );

  return (
    <Box flexDirection="column">
      {rows.map((row, rowIndex) => (
        <Box key={rowIndex} flexDirection="row" gap={1}>
          {row.map((result, colIndex) => {
            const index = rowIndex * GRID_COLUMNS + colIndex;
            const done = activeIndex >= RESULTS.length;

            if (done || index < activeIndex) {
              return (
                <Text key={index} color={RESULT_COLOR[result]}>
                  {RESULT_ICON[result]}
                </Text>
              );
            }

            if (index === activeIndex && slotState === "thinking") {
              return <Text key={index} color={RESULT_COLOR[result]}>{THINKING_CHARS[shimmerFrame]}</Text>;
            }

            return <Text key={index} color={COLORS.DIM}>·</Text>;
          })}
        </Box>
      ))}
    </Box>
  );
};
