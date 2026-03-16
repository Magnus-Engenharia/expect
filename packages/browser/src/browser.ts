import {
  detectBrowserProfiles,
  detectDefaultBrowser,
  extractCookies,
  extractProfileCookies,
  toPlaywrightCookies,
} from "@browser-tester/cookies";
import type { Browser as BrowserKey, BrowserProfile, Cookie } from "@browser-tester/cookies";
import { tmpdir } from "node:os";
import { chromium } from "playwright";
import type { Locator, Page } from "playwright";
import { Effect, Layer, ServiceMap } from "effect";
import {
  CONTENT_ROLES,
  DEFAULT_VIDEO_HEIGHT_PX,
  DEFAULT_VIDEO_WIDTH_PX,
  HEADLESS_CHROMIUM_ARGS,
  INTERACTIVE_ROLES,
  NAVIGATION_DETECT_DELAY_MS,
  POST_NAVIGATION_SETTLE_MS,
  REF_PREFIX,
  SNAPSHOT_TIMEOUT_MS,
} from "./constants";
import { BrowserLaunchError, NavigationError, SnapshotTimeoutError } from "./errors";
import { toActionError } from "./utils/action-error";
import { compactTree } from "./utils/compact-tree";
import { createLocator } from "./utils/create-locator";
import { findCursorInteractive } from "./utils/find-cursor-interactive";
import { getIndentLevel } from "./utils/get-indent-level";
import { parseAriaLine } from "./utils/parse-aria-line";
import { resolveNthDuplicates } from "./utils/resolve-nth-duplicates";
import { computeSnapshotStats } from "./utils/snapshot-stats";
import type {
  AnnotatedScreenshotOptions,
  Annotation,
  AriaRole,
  CreatePageOptions,
  RefMap,
  SnapshotOptions,
  VideoOptions,
} from "./types";

interface DefaultBrowserContext {
  defaultBrowser: BrowserKey | undefined;
  preferredProfile: BrowserProfile | undefined;
}

const EMPTY_DEFAULT_BROWSER_CONTEXT: DefaultBrowserContext = {
  defaultBrowser: undefined,
  preferredProfile: undefined,
};

const NO_INTERACTIVE_ELEMENTS = "(no interactive elements)";
const CURSOR_INTERACTIVE_HEADER = "# Cursor-interactive elements:";
const OVERLAY_CONTAINER_ID = "__browser_tester_annotation_overlay__";

const isTooDeep = (line: string, maxDepth?: number): boolean =>
  maxDepth !== undefined && getIndentLevel(line) > maxDepth;

const shouldAssignRef = (role: string, name: string, interactive?: boolean): boolean => {
  if (INTERACTIVE_ROLES.has(role)) return true;
  if (interactive) return false;
  return CONTENT_ROLES.has(role) && name.length > 0;
};

const resolveDefaultBrowserContext = Effect.fn("Browser.resolveDefaultBrowserContext")(
  function* () {
    const defaultBrowser = yield* Effect.tryPromise({
      try: () => detectDefaultBrowser(),
      catch: () => new BrowserLaunchError({ cause: "Failed to detect default browser" }),
    });

    if (!defaultBrowser) return EMPTY_DEFAULT_BROWSER_CONTEXT;

    const profiles = yield* Effect.try({
      try: () => detectBrowserProfiles({ browser: defaultBrowser }),
      catch: () => new BrowserLaunchError({ cause: "Failed to detect browser profiles" }),
    });

    return {
      defaultBrowser,
      preferredProfile: profiles[0] as BrowserProfile | undefined,
    };
  },
);

const extractDefaultBrowserCookies = Effect.fn("Browser.extractDefaultBrowserCookies")(function* (
  url: string,
  defaultBrowserContext: DefaultBrowserContext,
) {
  const { defaultBrowser, preferredProfile } = defaultBrowserContext;

  if (preferredProfile) {
    const result = yield* Effect.tryPromise({
      try: () => extractProfileCookies({ profile: preferredProfile }),
      catch: () => new BrowserLaunchError({ cause: "Failed to extract profile cookies" }),
    });
    if (result.cookies.length > 0) return result.cookies;
  }

  const browsers = defaultBrowser ? [defaultBrowser] : undefined;
  const result = yield* Effect.tryPromise({
    try: () => extractCookies({ url, browsers }),
    catch: () => new BrowserLaunchError({ cause: "Failed to extract cookies" }),
  });
  return result.cookies;
});

const resolveVideoOptions = (
  video: boolean | VideoOptions | undefined,
): VideoOptions | undefined => {
  if (!video) return undefined;
  if (video === true) {
    return {
      dir: tmpdir(),
      size: { width: DEFAULT_VIDEO_WIDTH_PX, height: DEFAULT_VIDEO_HEIGHT_PX },
    };
  }
  return {
    ...video,
    size: video.size ?? { width: DEFAULT_VIDEO_WIDTH_PX, height: DEFAULT_VIDEO_HEIGHT_PX },
  };
};

const resolveContextOptions = (video: VideoOptions | undefined, locale: string | undefined) => {
  if (!video && !locale) return undefined;
  return {
    ...(video ? { recordVideo: video } : {}),
    ...(locale ? { locale } : {}),
  };
};

const appendCursorInteractiveElements = Effect.fn("Browser.appendCursorInteractive")(function* (
  page: Page,
  filteredLines: string[],
  refs: RefMap,
  refCount: number,
  options: SnapshotOptions,
) {
  const cursorElements = yield* findCursorInteractive(page, options.selector);
  if (cursorElements.length === 0) return refCount;

  const existingNames = new Set(Object.values(refs).map((entry) => entry.name.toLowerCase()));
  const newLines: string[] = [];

  for (const element of cursorElements) {
    if (existingNames.has(element.text.toLowerCase())) continue;
    existingNames.add(element.text.toLowerCase());

    const ref = `${REF_PREFIX}${++refCount}`;
    refs[ref] = {
      // HACK: "clickable" is a synthetic role not in Playwright's AriaRole union
      role: "clickable" as AriaRole,
      name: element.text,
      selector: element.selector,
    };
    newLines.push(`- clickable "${element.text}" [ref=${ref}] [${element.reason}]`);
  }

  if (newLines.length > 0) {
    filteredLines.push(CURSOR_INTERACTIVE_HEADER);
    filteredLines.push(...newLines);
  }

  return refCount;
});

const injectOverlayLabels = (page: Page, labels: Array<{ label: number; x: number; y: number }>) =>
  Effect.tryPromise(() =>
    page.evaluate(
      ({
        containerId,
        items,
      }: {
        containerId: string;
        items: Array<{ label: number; x: number; y: number }>;
      }) => {
        const container = document.createElement("div");
        container.id = containerId;
        container.style.position = "absolute";
        container.style.top = "0";
        container.style.left = "0";
        container.style.zIndex = "2147483647";
        container.style.pointerEvents = "none";

        for (const item of items) {
          const badge = document.createElement("div");
          badge.textContent = `[${item.label}]`;
          badge.style.position = "absolute";
          badge.style.left = `${item.x}px`;
          badge.style.top = `${item.y}px`;
          badge.style.background = "rgba(255, 0, 0, 0.85)";
          badge.style.color = "white";
          badge.style.fontSize = "11px";
          badge.style.fontFamily = "monospace";
          badge.style.fontWeight = "bold";
          badge.style.padding = "1px 3px";
          badge.style.borderRadius = "3px";
          badge.style.lineHeight = "1.2";
          badge.style.whiteSpace = "nowrap";
          container.appendChild(badge);
        }

        document.body.appendChild(container);
      },
      { containerId: OVERLAY_CONTAINER_ID, items: labels },
    ),
  ).pipe(Effect.orDie);

const removeOverlay = (page: Page) =>
  Effect.tryPromise(() =>
    page.evaluate((containerId: string) => {
      document.getElementById(containerId)?.remove();
    }, OVERLAY_CONTAINER_ID),
  ).pipe(Effect.ignore);

export class Browser extends ServiceMap.Service<Browser>()("@browser/Browser", {
  make: Effect.gen(function* () {
    const createPage = Effect.fn("Browser.createPage")(function* (
      url: string | undefined,
      options: CreatePageOptions = {},
    ) {
      yield* Effect.annotateCurrentSpan({ url: url ?? "about:blank" });

      const browser = yield* Effect.tryPromise({
        try: () =>
          chromium.launch({
            headless: !options.headed,
            executablePath: options.executablePath,
            args: HEADLESS_CHROMIUM_ARGS,
          }),
        catch: (cause) =>
          new BrowserLaunchError({
            cause: cause instanceof Error ? cause.message : String(cause),
          }),
      });

      const setupPage = Effect.gen(function* () {
        const defaultBrowserContext =
          options.cookies === true
            ? yield* resolveDefaultBrowserContext()
            : EMPTY_DEFAULT_BROWSER_CONTEXT;

        const recordVideo = resolveVideoOptions(options.video);
        const context = yield* Effect.tryPromise({
          try: () =>
            browser.newContext(
              resolveContextOptions(recordVideo, defaultBrowserContext.preferredProfile?.locale),
            ),
          catch: (cause) =>
            new BrowserLaunchError({
              cause: cause instanceof Error ? cause.message : String(cause),
            }),
        });

        if (options.cookies) {
          const cookies: Cookie[] = Array.isArray(options.cookies)
            ? options.cookies
            : yield* extractDefaultBrowserCookies(url ?? "", defaultBrowserContext);
          yield* Effect.tryPromise({
            try: () => context.addCookies(toPlaywrightCookies(cookies)),
            catch: (cause) =>
              new BrowserLaunchError({
                cause: cause instanceof Error ? cause.message : String(cause),
              }),
          });
        }

        const page = yield* Effect.tryPromise({
          try: () => context.newPage(),
          catch: (cause) =>
            new BrowserLaunchError({
              cause: cause instanceof Error ? cause.message : String(cause),
            }),
        });

        if (url) {
          yield* Effect.tryPromise({
            try: () => page.goto(url, { waitUntil: options.waitUntil ?? "load" }),
            catch: (cause) =>
              new NavigationError({
                url,
                cause: cause instanceof Error ? cause.message : String(cause),
              }),
          });
        }

        return { browser, context, page };
      });

      return yield* setupPage.pipe(
        Effect.tapError(() => Effect.tryPromise(() => browser.close()).pipe(Effect.ignore)),
      );
    });

    const snapshot = Effect.fn("Browser.snapshot")(function* (
      page: Page,
      options: SnapshotOptions = {},
    ) {
      const timeout = options.timeout ?? SNAPSHOT_TIMEOUT_MS;
      const selector = options.selector ?? "body";
      yield* Effect.annotateCurrentSpan({ selector });

      const root = page.locator(selector);
      const rawTree = yield* Effect.tryPromise({
        try: () => root.ariaSnapshot({ timeout }),
        catch: (cause) =>
          new SnapshotTimeoutError({
            selector,
            timeoutMs: timeout,
            cause: cause instanceof Error ? cause.message : String(cause),
          }),
      });

      const refs: RefMap = {};
      const filteredLines: string[] = [];
      let refCount = 0;

      for (const line of rawTree.split("\n")) {
        if (isTooDeep(line, options.maxDepth)) continue;

        const parsed = parseAriaLine(line);
        if (!parsed) {
          if (!options.interactive) filteredLines.push(line);
          continue;
        }

        if (options.interactive && !INTERACTIVE_ROLES.has(parsed.role)) continue;

        if (shouldAssignRef(parsed.role, parsed.name, options.interactive)) {
          const ref = `${REF_PREFIX}${++refCount}`;
          refs[ref] = { role: parsed.role, name: parsed.name };
          filteredLines.push(`${line} [ref=${ref}]`);
        } else {
          filteredLines.push(line);
        }
      }

      if (options.cursor) {
        refCount = yield* appendCursorInteractiveElements(
          page,
          filteredLines,
          refs,
          refCount,
          options,
        );
      }

      resolveNthDuplicates(refs);

      let tree = filteredLines.join("\n");
      if (options.interactive && refCount === 0) tree = NO_INTERACTIVE_ELEMENTS;
      if (options.compact) tree = compactTree(tree);

      const stats = computeSnapshotStats(tree, refs);

      return { tree, refs, stats, locator: createLocator(page, refs) };
    });

    const act = Effect.fn("Browser.act")(function* (
      page: Page,
      ref: string,
      action: (locator: Locator) => Promise<void>,
      options?: SnapshotOptions,
    ) {
      yield* Effect.annotateCurrentSpan({ ref });
      const before = yield* snapshot(page, options);
      const locator = yield* before.locator(ref);
      yield* Effect.tryPromise({
        try: () => action(locator),
        catch: (error) => toActionError(error, ref),
      });
      return yield* snapshot(page, options);
    });

    const annotatedScreenshot = Effect.fn("Browser.annotatedScreenshot")(function* (
      page: Page,
      options: AnnotatedScreenshotOptions = {},
    ) {
      const snapshotResult = yield* snapshot(page, options);
      const annotations: Annotation[] = [];
      const labelPositions: Array<{ label: number; x: number; y: number }> = [];

      let labelCounter = 0;

      for (const [ref, entry] of Object.entries(snapshotResult.refs)) {
        const locator = yield* snapshotResult.locator(ref);
        const box = yield* Effect.tryPromise(() => locator.boundingBox()).pipe(
          Effect.orElseSucceed(() => null),
        );
        if (!box) continue;

        labelCounter++;
        annotations.push({ label: labelCounter, ref, role: entry.role, name: entry.name });
        labelPositions.push({ label: labelCounter, x: box.x, y: box.y });
      }

      yield* injectOverlayLabels(page, labelPositions);
      return yield* Effect.ensuring(
        Effect.tryPromise(() => page.screenshot({ fullPage: options.fullPage })).pipe(
          Effect.orDie,
          Effect.map((screenshotBuffer) => ({ screenshot: screenshotBuffer, annotations })),
        ),
        removeOverlay(page),
      );
    });

    const saveVideo = Effect.fn("Browser.saveVideo")(function* (page: Page, outputPath: string) {
      const video = page.video();
      if (!video) return undefined;
      yield* Effect.tryPromise(() => page.close()).pipe(Effect.orDie);
      yield* Effect.tryPromise(() => video.saveAs(outputPath)).pipe(Effect.orDie);
      return outputPath;
    });

    const waitForNavigationSettle = Effect.fn("Browser.waitForNavigationSettle")(function* (
      page: Page,
      urlBefore: string,
    ) {
      yield* Effect.tryPromise(() => page.waitForTimeout(NAVIGATION_DETECT_DELAY_MS)).pipe(
        Effect.orDie,
      );
      if (page.url() !== urlBefore) {
        yield* Effect.tryPromise(() => page.waitForLoadState("domcontentloaded")).pipe(
          Effect.ignore,
        );
        yield* Effect.tryPromise(() => page.waitForTimeout(POST_NAVIGATION_SETTLE_MS)).pipe(
          Effect.orDie,
        );
      }
    });

    return {
      createPage,
      snapshot,
      act,
      annotatedScreenshot,
      saveVideo,
      waitForNavigationSettle,
    } as const;
  }),
}) {
  static layer = Layer.effect(this)(this.make);
}

export type BrowserMethods = typeof Browser.Service;

export const runBrowser = <A>(
  effect: (browser: BrowserMethods) => Effect.Effect<A, unknown>,
): Promise<A> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const browser = yield* Browser;
      return yield* effect(browser);
    }).pipe(Effect.provide(Browser.layer)),
  );
