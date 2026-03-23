import { useRef, useEffect, useState } from "react";
import type { eventWithTime } from "@rrweb/types";
import { REPLAY_PLAYER_WIDTH_PX, REPLAY_PLAYER_HEIGHT_PX } from "@/constants";
import { Card, CardContent } from "@/components/ui/card";
import "rrweb-player/dist/style.css";

interface RrwebPlayerHandle {
  getReplayer: () => {
    addEvent: (event: eventWithTime) => void;
    startLive: () => void;
  };
}

export const LiveReplayPlayer = ({ events }: { events: eventWithTime[] }) => {
  const containerRef = useRef<HTMLDivElement>(undefined);
  const playerRef = useRef<RrwebPlayerHandle | undefined>(undefined);
  const addedCountRef = useRef(0);
  const [initialized, setInitialized] = useState(false);

  const hasEnoughEvents = events.length >= 2;

  useEffect(() => {
    if (!hasEnoughEvents || initialized || !containerRef.current) return;

    import("rrweb-player").then((mod) => {
      if (!containerRef.current || playerRef.current) return;
      const RrwebPlayer = mod.default;
      playerRef.current = new RrwebPlayer({
        target: containerRef.current,
        props: {
          events,
          width: REPLAY_PLAYER_WIDTH_PX,
          height: REPLAY_PLAYER_HEIGHT_PX,
          autoPlay: true,
          showController: false,
          liveMode: true,
        },
      }) as RrwebPlayerHandle;
      playerRef.current.getReplayer().startLive();
      addedCountRef.current = events.length;
      setInitialized(true);
    });
  }, [hasEnoughEvents, initialized, events]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || events.length <= addedCountRef.current) return;
    for (let eventIndex = addedCountRef.current; eventIndex < events.length; eventIndex++) {
      player.getReplayer().addEvent(events[eventIndex]);
    }
    addedCountRef.current = events.length;
  }, [events]);

  if (!hasEnoughEvents) {
    return (
      <Card>
        <CardContent className="py-4 text-center text-muted-foreground">
          {events.length === 0 ? "Waiting for replay events\u2026" : "Waiting for more events\u2026"}
        </CardContent>
      </Card>
    );
  }

  return <div ref={containerRef} className="rounded-lg overflow-hidden" />;
};
