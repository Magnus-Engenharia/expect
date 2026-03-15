"use client";

import { type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoPlaybackStore } from "@/stores/demo-playback-store";

interface DemoContainerProps {
  children: ReactNode;
}

export const DemoContainer = ({ children }: DemoContainerProps) => {
  const { isPlaying, toggle } = useDemoPlaybackStore();

  return (
    <div className="relative w-full overflow-hidden rounded-xs border bg-muted dark:bg-background">
      {children}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={toggle}
        aria-label={isPlaying ? "Pause demo" : "Play demo"}
        className="absolute right-2 bottom-2"
      >
        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
      </Button>
    </div>
  );
};
