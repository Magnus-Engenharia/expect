"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useDemoPlaybackStore } from "@/stores/demo-playback-store";
import {
  DEMO_CHAR_INTERVAL_MS,
  DEMO_LINE_PAUSE_MS,
  DEMO_PROMPT_PAUSE_MS,
  DEMO_RESTART_DELAY_MS,
} from "@/constants";

interface DemoLine {
  text: string;
  style: "prompt" | "input" | "output" | "accent";
  pauseAfter?: number;
}

const DEMO_SCRIPT: DemoLine[] = [
  { text: "$ npx template", style: "prompt" },
  { text: "", style: "output", pauseAfter: DEMO_LINE_PAUSE_MS },
  { text: "◆ What do you want to build?", style: "accent", pauseAfter: DEMO_PROMPT_PAUSE_MS },
  { text: "  A dashboard with auth and real-time charts", style: "input" },
  { text: "", style: "output", pauseAfter: DEMO_LINE_PAUSE_MS },
  { text: "◆ What framework are you using?", style: "accent", pauseAfter: DEMO_PROMPT_PAUSE_MS },
  { text: "  Next.js with App Router", style: "input" },
  { text: "", style: "output", pauseAfter: DEMO_LINE_PAUSE_MS },
  { text: "◆ Do you need a database?", style: "accent", pauseAfter: DEMO_PROMPT_PAUSE_MS },
  { text: "  Yes — Postgres with Drizzle ORM", style: "input" },
  { text: "", style: "output", pauseAfter: DEMO_LINE_PAUSE_MS },
  { text: "✓ Plan generated — 47 steps across 12 files", style: "accent" },
];

const LINE_STYLES: Record<DemoLine["style"], string> = {
  prompt: "text-foreground font-semibold",
  input: "text-muted-foreground",
  output: "",
  accent: "text-foreground",
};

export const TerminalDemo = () => {
  const { isPlaying } = useDemoPlaybackStore();
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const lineIndexRef = useRef(0);
  const charIndexRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const isFinished = lineIndexRef.current >= DEMO_SCRIPT.length && visibleLines.length > 0;

  const resetDemo = useCallback(() => {
    setVisibleLines([]);
    lineIndexRef.current = 0;
    charIndexRef.current = 0;
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    if (isFinished) {
      resetDemo();
    }

    const tick = () => {
      const lineIndex = lineIndexRef.current;

      if (lineIndex >= DEMO_SCRIPT.length) {
        timeoutRef.current = setTimeout(() => {
          resetDemo();
        }, DEMO_RESTART_DELAY_MS);
        return;
      }

      const line = DEMO_SCRIPT[lineIndex];
      const charIndex = charIndexRef.current;

      if (charIndex === 0 && line.text === "") {
        setVisibleLines((previous) => [...previous, ""]);
        lineIndexRef.current += 1;
        charIndexRef.current = 0;
        timeoutRef.current = setTimeout(tick, line.pauseAfter ?? DEMO_LINE_PAUSE_MS);
        return;
      }

      if (charIndex < line.text.length) {
        charIndexRef.current += 1;
        setVisibleLines((previous) => {
          const updated = [...previous];
          if (charIndex === 0) {
            updated.push(line.text[0]);
          } else {
            updated[updated.length - 1] = line.text.slice(0, charIndex + 1);
          }
          return updated;
        });
        timeoutRef.current = setTimeout(tick, DEMO_CHAR_INTERVAL_MS);
      } else {
        lineIndexRef.current += 1;
        charIndexRef.current = 0;
        timeoutRef.current = setTimeout(tick, line.pauseAfter ?? DEMO_LINE_PAUSE_MS);
      }
    };

    timeoutRef.current = setTimeout(tick, DEMO_CHAR_INTERVAL_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isPlaying, resetDemo, isFinished]);


  const showCursor = isPlaying && !isFinished;

  return (
    <>
      <div className="flex items-center gap-1.5 border-b px-3 py-2">
        <div className="size-2 rounded-full bg-foreground/15" />
        <div className="size-2 rounded-full bg-foreground/15" />
        <div className="size-2 rounded-full bg-foreground/15" />

      </div>
      <div className="flex h-[240px] flex-col-reverse overflow-y-auto p-3 font-mono text-xs leading-5">
        <div>
          <AnimatePresence initial={false}>
            {visibleLines.map((text, index) => {
              const scriptLine = DEMO_SCRIPT[index];
              if (!scriptLine || text === "") return <div key={index} className="h-5" />;

              const isActiveLine = index === visibleLines.length - 1 && !isFinished;
              const isNewLine = index === visibleLines.length - 1 && charIndexRef.current <= 1;

              return (
                <motion.div
                  key={index}
                  initial={isNewLine ? { opacity: 0, y: 4 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className={LINE_STYLES[scriptLine.style]}
                >
                  {text}
                  {isActiveLine && showCursor && (
                    <motion.span
                      className="ml-px inline-block h-3.5 w-[5px] translate-y-px bg-foreground"
                      animate={{ opacity: [1, 1, 0, 0] }}
                      transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
                    />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};
