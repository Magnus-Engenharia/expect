import { useState, useEffect } from "react";
import type { eventWithTime } from "@rrweb/types";
import type { ViewerRunState } from "@/types";

export interface LiveData {
  readonly events: eventWithTime[];
  readonly stepState: ViewerRunState | undefined;
}

export const useLiveData = (): LiveData => {
  const [events, setEvents] = useState<eventWithTime[]>([]);
  const [stepState, setStepState] = useState<ViewerRunState | undefined>(undefined);

  useEffect(() => {
    fetch("/latest.json")
      .then((response) => (response.ok ? response.json() : []))
      .then((initial: eventWithTime[]) => setEvents(initial))
      .catch(() => {});

    fetch("/steps")
      .then((response) => (response.ok ? response.json() : undefined))
      .then((state: ViewerRunState | undefined) => {
        if (state) setStepState(state);
      })
      .catch(() => {});

    const eventSource = new EventSource("/events");

    eventSource.addEventListener("replay", (message) => {
      try {
        const incoming = JSON.parse(message.data) as eventWithTime[];
        setEvents((previous) => [...previous, ...incoming]);
      } catch {}
    });

    eventSource.addEventListener("steps", (message) => {
      try {
        setStepState(JSON.parse(message.data) as ViewerRunState);
      } catch {}
    });

    eventSource.addEventListener("complete", () => {
      window.location.href = "/report";
    });

    return () => eventSource.close();
  }, []);

  return { events, stepState };
};
