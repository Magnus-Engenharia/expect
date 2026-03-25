"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import type { eventWithTime } from "@posthog/rrweb";
import { ReplayViewer } from "@/components/replay/replay-viewer";
import { MacWindow } from "@/components/replay/mac-window";
import { startRecording, stopRecording } from "@/lib/rrweb";
import { useMountEffect } from "@/hooks/use-mount-effect";
import type { ViewerRunState } from "@/lib/replay-types";
import { DEMO_TRACE } from "@/lib/demo-trace";
import { DEMO_EVENTS } from "@/lib/demo-events";

const POLL_INTERVAL_MS = 500;
const RECORDING_TICK_MS = 1000;
const VIEWER_SHELL_SHADOW = "color(display-p3 0.788 0.788 0.788 / 20%) 0px 2px 3px";
const PLAYBACK_BAR_SURFACE_COLOR = "color(display-p3 0.938 0.938 0.938)";
const PLAYBACK_BAR_SHADOW = "color(display-p3 0.281 0.281 0.281 / 22%) 0px 0px 0px 1px";
const PLAYBACK_BAR_BUTTON_SHADOW = "color(display-p3 0.847 0.847 0.847) 0px 0px 0px 0.5px";
const CONTROL_FONT_FAMILY =
  '"SF Pro Display", "SFProDisplay-Medium", "Inter Variable", system-ui, sans-serif';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

const formatElapsed = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const RecordingMode = () => {
  const [recording, setRecording] = useState(true);
  const [events, setEvents] = useState<eventWithTime[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useMountEffect(() => {
    void startRecording();
  });

  useEffect(() => {
    if (!recording) return;
    const interval = setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, RECORDING_TICK_MS);
    return () => clearInterval(interval);
  }, [recording]);

  const handleCompleteRecording = () => {
    const recordedEvents = stopRecording();
    if (recordedEvents.length < 2) return;
    setEvents(recordedEvents);
    setRecording(false);
  };

  if (!recording) {
    return <ReplayViewer events={events} />;
  }

  return (
    <div
      data-rrweb-block
      className="flex h-screen flex-col gap-3 bg-[color(display-p3_0.986_0.986_0.986)] p-6"
      style={{ fontFamily: CONTROL_FONT_FAMILY }}
    >
      <div
        className="flex h-0 grow overflow-hidden rounded-[26px] border-[7px] border-solid border-[color(display-p3_1_1_1)] bg-[color(display-p3_0.977_0.977_0.977)]"
        style={{ boxShadow: VIEWER_SHELL_SHADOW }}
      >
        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-0 bg-linear-to-br from-sky-200 to-blue-400 p-6">
            <div
              className="glow-pulse pointer-events-none absolute inset-0"
              style={{ boxShadow: "inset 0 0 120px 40px rgba(96, 165, 250, 0.35)" }}
            />
            <MacWindow>
              <div className="flex h-full flex-col items-center justify-center gap-6">
                <div className="relative flex size-20 items-center justify-center">
                  <div className="recording-ripple absolute inset-0 rounded-full border border-red-500/20" />
                  <div className="flex size-10 items-center justify-center rounded-full bg-red-500/10">
                    <div className="size-3.5 rounded-full bg-red-500 shadow-[0_0_12px_4px_rgba(239,68,68,0.2)]" />
                  </div>
                </div>
                <p className="max-w-[240px] text-center text-[13px] leading-relaxed text-neutral-400">
                  Interact with the page, then stop to review the session replay.
                </p>
              </div>
            </MacWindow>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[28px] px-6 pt-3 pb-5">
        <div className="mt-1.5 flex items-center justify-between gap-4 p-0 antialiased [font-synthesis:none]">
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="h-4.5 shrink-0 font-['SFProDisplay-Medium','SF_Pro_Display',system-ui,sans-serif] text-base/4.5 font-medium tracking-[0em] text-[color(display-p3_0.587_0.587_0.587)]">
              Recording session
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="inline-flex items-center text-[15px] leading-4.5 font-medium tracking-[0em] tabular-nums text-[color(display-p3_0.361_0.361_0.361)]">
              {formatElapsed(elapsedSeconds)}
            </span>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1">
              <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-red-500">
                Recording
              </span>
            </div>
          </div>
        </div>

        <div className="relative pb-6">
          <div
            className="relative h-9.75 overflow-hidden rounded-full"
            style={{
              backgroundColor: PLAYBACK_BAR_SURFACE_COLOR,
              boxShadow: PLAYBACK_BAR_SHADOW,
            }}
          >
            <button
              type="button"
              onClick={handleCompleteRecording}
              aria-label="Stop recording"
              className="absolute inset-y-1.5 left-1.5 z-30 flex w-12.75 items-center justify-center rounded-full bg-white transition-transform duration-150 ease-out active:scale-[0.97]"
              style={{ boxShadow: PLAYBACK_BAR_BUTTON_SHADOW }}
            >
              <div className="size-3 rounded-[3px] bg-red-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const fetchLatestEvents = async (): Promise<eventWithTime[]> => {
  const response = await fetch("/latest.json");
  if (!response.ok) return [];
  return response.json();
};

const fetchSteps = async (): Promise<ViewerRunState> => {
  const response = await fetch("/steps");
  if (!response.ok) return { title: "", status: "running", summary: undefined, steps: [] };
  return response.json();
};

const LiveMode = () => {
  const addEventsRef = useRef<((newEvents: eventWithTime[]) => void) | undefined>(undefined);
  const prevEventCountRef = useRef(0);

  const eventsQuery = useQuery({
    queryKey: ["replay-events"],
    queryFn: fetchLatestEvents,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const stepsQuery = useQuery({
    queryKey: ["replay-steps"],
    queryFn: fetchSteps,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const events = eventsQuery.data ?? [];
  const steps = stepsQuery.data;
  const isRunning = !steps || (steps.status === "running" && !steps.done);

  useEffect(() => {
    if (events.length <= prevEventCountRef.current) return;
    const newEvents = events.slice(prevEventCountRef.current);
    prevEventCountRef.current = events.length;
    addEventsRef.current?.(newEvents);
  }, [events.length]);

  const handleAddEventsRef = (handler: (newEvents: eventWithTime[]) => void) => {
    addEventsRef.current = handler;
  };

  return (
    <ReplayViewer
      events={events}
      steps={steps}
      live={isRunning}
      onAddEventsRef={handleAddEventsRef}
    />
  );
};

const DemoMode = () => {
  return <ReplayViewer events={DEMO_EVENTS} steps={DEMO_TRACE} autoPlay />;
};

const ReplayPageInner = () => {
  const searchParams = useSearchParams();
  const isLive = searchParams.get("live") === "true";
  const isDemo = searchParams.get("demo") === "true";

  if (isDemo) {
    return <DemoMode />;
  }

  if (isLive) {
    return <LiveMode />;
  }

  return <RecordingMode />;
};

export default function ReplayPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense>
        <ReplayPageInner />
      </Suspense>
    </QueryClientProvider>
  );
}
