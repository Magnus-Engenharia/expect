export { createPage } from "./create-page";
export { injectCookies } from "./inject-cookies";
export { act } from "./act";
export { snapshot } from "./snapshot";
export {
  CookieJar,
  detectBrowserProfiles,
  extractAllProfileCookies,
  extractCookies,
  extractProfileCookies,
  toCookieHeader,
} from "@browser-tester/cookies";
export type {
  Browser,
  BrowserInfo,
  BrowserProfile,
  Cookie,
  ExtractOptions,
  ExtractProfileOptions,
  ExtractResult,
} from "@browser-tester/cookies";
export type {
  AriaRole,
  CreatePageOptions,
  CreatePageResult,
  RefEntry,
  RefMap,
  SnapshotOptions,
  SnapshotResult,
} from "./types";
