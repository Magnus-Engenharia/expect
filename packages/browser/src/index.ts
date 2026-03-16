export { Browser, runBrowser } from "./browser";
export { diffSnapshots } from "./diff";
export {
  detectBrowserProfiles,
  detectDefaultBrowser,
  extractCookies,
  extractProfileCookies,
  toPlaywrightCookies,
} from "@browser-tester/cookies";
export type {
  Browser as BrowserKey,
  BrowserProfile,
  Cookie,
  ExtractOptions,
  ExtractResult,
  PlaywrightCookie,
} from "@browser-tester/cookies";
export {
  ActionTimeoutError,
  BrowserLaunchError,
  NavigationError,
  RefAmbiguousError,
  RefBlockedError,
  RefNotFoundError,
  RefNotVisibleError,
  SnapshotTimeoutError,
} from "./errors";
export type { ActionError } from "./errors";
export type {
  Annotation,
  AnnotatedScreenshotOptions,
  AnnotatedScreenshotResult,
  AriaRole,
  CreatePageOptions,
  RefEntry,
  RefMap,
  SnapshotDiff,
  SnapshotOptions,
  SnapshotResult,
  SnapshotStats,
  VideoOptions,
} from "./types";
