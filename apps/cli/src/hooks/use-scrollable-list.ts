import { useCallback, useMemo, useRef, useState } from "react";
import type { Key } from "ink";

interface ScrollableListOptions {
  itemCount: number;
  visibleCount: number;
  initialIndex?: number | (() => number);
}

interface ScrollableListResult {
  highlightedIndex: number;
  setHighlightedIndex: React.Dispatch<React.SetStateAction<number>>;
  scrollOffset: number;
  handleNavigation: (input: string, key: Key) => boolean;
}

export const useScrollableList = ({
  itemCount,
  visibleCount,
  initialIndex,
}: ScrollableListOptions): ScrollableListResult => {
  const [highlightedIndex, setHighlightedIndex] = useState(initialIndex ?? 0);

  const previousItemCountRef = useRef(itemCount);
  if (previousItemCountRef.current !== itemCount) {
    previousItemCountRef.current = itemCount;
    setHighlightedIndex((previous) => Math.min(previous, Math.max(0, itemCount - 1)));
  }

  const scrollOffset = useMemo(() => {
    if (itemCount <= visibleCount) return 0;
    const half = Math.floor(visibleCount / 2);
    const maxOffset = itemCount - visibleCount;
    return Math.min(maxOffset, Math.max(0, highlightedIndex - half));
  }, [itemCount, visibleCount, highlightedIndex]);

  const handleNavigation = useCallback(
    (input: string, key: Key): boolean => {
      if (key.downArrow || input === "j" || (key.ctrl && input === "n")) {
        setHighlightedIndex((previous) => Math.min(itemCount - 1, previous + 1));
        return true;
      }
      if (key.upArrow || input === "k" || (key.ctrl && input === "p")) {
        setHighlightedIndex((previous) => Math.max(0, previous - 1));
        return true;
      }
      return false;
    },
    [itemCount],
  );

  return { highlightedIndex, setHighlightedIndex, scrollOffset, handleNavigation };
};
