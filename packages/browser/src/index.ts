export { Browser, runBrowser } from "./browser";
export { diffSnapshots } from "./diff";
export {
  Browsers,
  Cookies,
  layerLive,
} from "@browser-tester/cookies";
export type {
  Browser as BrowserKey,
  BrowserInfo,
  BrowserProfile,
  Cookie,
  SameSitePolicy,
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
  CreatePageResult,
  RefEntry,
  RefMap,
  SnapshotDiff,
  SnapshotOptions,
  SnapshotResult,
  SnapshotStats,
  VideoOptions,
} from "./types";
