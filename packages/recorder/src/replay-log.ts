import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { eventWithTime } from "@rrweb/types";
import { RUN_STATE_FILE_NAME } from "./constants";
import type { ViewerRunState } from "./viewer-events";

export interface ReplayLog {
  readonly appendEvents: (events: readonly eventWithTime[]) => void;
  readonly writeRunState: (state: ViewerRunState) => void;
}

export const createReplayLog = (ndjsonPath: string): ReplayLog => {
  const directory = dirname(ndjsonPath);
  mkdirSync(directory, { recursive: true });
  writeFileSync(ndjsonPath, "");

  return {
    appendEvents: (events) => {
      if (events.length === 0) return;
      const lines = events.map((event) => JSON.stringify(event)).join("\n") + "\n";
      appendFileSync(ndjsonPath, lines);
    },
    writeRunState: (state) => {
      writeFileSync(join(directory, RUN_STATE_FILE_NAME), JSON.stringify(state));
    },
  };
};
