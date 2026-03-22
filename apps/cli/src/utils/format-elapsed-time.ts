import prettyMs from "pretty-ms";

export const formatElapsedTime = (elapsedTimeMs: number): string =>
  prettyMs(Math.floor(Math.max(0, elapsedTimeMs) / 1000) * 1000, { secondsDecimalDigits: 0 });
