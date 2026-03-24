import { useCallback, useRef, useState } from "react";
import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";
import type { eventWithTime } from "@rrweb/types";
import {
  EVENT_COLLECT_INTERVAL_MS,
  REPLAY_FILE_NAME,
  REPLAY_PLAYER_HEIGHT_PX,
  REPLAY_PLAYER_WIDTH_PX,
  RUN_STATE_FILE_NAME,
  EXPECT_STATE_DIR,
} from "../../src/constants";
import type { ViewerRunState } from "../../src/viewer-events";
import { useMountEffect } from "./hooks/use-mount-effect";
import { StepsPanel } from "./steps-panel";

const REPLAY_URL = `/${EXPECT_STATE_DIR}/${REPLAY_FILE_NAME}`;
const RUN_STATE_URL = `/${EXPECT_STATE_DIR}/${RUN_STATE_FILE_NAME}`;

export const App = () => {
  const [runState, setRunState] = useState<ViewerRunState | undefined>();
  const [status, setStatus] = useState("Waiting for test run\u2026");
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<rrwebPlayer | undefined>();
  const eventsRef = useRef<eventWithTime[]>([]);
  const eventCountRef = useRef(0);

  const initPlayer = useCallback((events: eventWithTime[]) => {
    if (playerRef.current) {
      playerRef.current.getReplayer().addEvent(events.at(-1)!);
      return;
    }
    if (events.length < 2 || !containerRef.current) return;

    setStatus("");
    playerRef.current = new rrwebPlayer({
      target: containerRef.current,
      props: {
        events,
        width: REPLAY_PLAYER_WIDTH_PX,
        height: REPLAY_PLAYER_HEIGHT_PX,
        autoPlay: true,
        showController: true,
      },
    });
  }, []);

  useMountEffect(() => {
    const poll = async () => {
      try {
        const replayResponse = await fetch(REPLAY_URL);
        if (replayResponse.ok) {
          const text = await replayResponse.text();
          if (text.trim()) {
            const lines = text.trim().split("\n");
            if (lines.length > eventCountRef.current) {
              const newLines = lines.slice(eventCountRef.current);
              for (const line of newLines) {
                const event: eventWithTime = JSON.parse(line);
                eventsRef.current.push(event);
                if (playerRef.current) {
                  playerRef.current.getReplayer().addEvent(event);
                }
              }
              eventCountRef.current = lines.length;
              if (!playerRef.current && eventsRef.current.length >= 2) {
                initPlayer(eventsRef.current);
              }
              setStatus("");
            }
          }
        }
      } catch {
        /* file not available yet */
      }

      try {
        const stateResponse = await fetch(RUN_STATE_URL);
        if (stateResponse.ok) {
          const state: ViewerRunState = await stateResponse.json();
          if (state?.steps) setRunState(state);
        }
      } catch {
        /* run state not available yet */
      }
    };

    poll();
    const interval = setInterval(poll, EVENT_COLLECT_INTERVAL_MS);
    return () => clearInterval(interval);
  });

  return (
    <div className="mx-auto max-w-[960px] p-8">
      <StepsPanel state={runState} />
      <div className="overflow-hidden rounded-lg">
        {status && <div className="p-4 text-center text-sm text-muted-foreground">{status}</div>}
        <div ref={containerRef} />
      </div>
    </div>
  );
};
