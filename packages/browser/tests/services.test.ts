import { chromium } from "playwright";
import type { Browser as PlaywrightBrowser, Page } from "playwright";
import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";
import { Browser } from "../src/browser";
import { diffSnapshots } from "../src/diff";

let playwrightBrowser: PlaywrightBrowser;
let page: Page;

describe.sequential("Browser service", () => {
  it.effect(
    "setup browser",
    () =>
      Effect.gen(function* () {
        playwrightBrowser = yield* Effect.promise(() => chromium.launch({ headless: true }));
        const context = yield* Effect.promise(() => playwrightBrowser.newContext());
        page = yield* Effect.promise(() => context.newPage());
      }),
    { timeout: 15_000 },
  );

  it.effect("snapshot returns a tree with refs for a page with interactive elements", () =>
    Effect.gen(function* () {
      yield* Effect.promise(() =>
        page.setContent(
          `<html><body><h1>Title</h1><button>Submit</button><a href="/about">About</a></body></html>`,
        ),
      );

      const browser = yield* Browser;
      const result = yield* browser.snapshot(page);

      assert.isString(result.tree);
      assert.include(result.tree, "heading");
      assert.include(result.tree, "Submit");
      assert.include(result.tree, "[ref=");
      assert.isAbove(Object.keys(result.refs).length, 0);
      assert.isAbove(result.stats.totalRefs, 0);
      assert.isAbove(result.stats.interactiveRefs, 0);
      assert.isFunction(result.locator);
    }).pipe(Effect.provide(Browser.layer)),
  );

  it.effect("snapshot with interactive filter excludes non-interactive roles", () =>
    Effect.gen(function* () {
      yield* Effect.promise(() =>
        page.setContent(`<html><body><h1>Title</h1><p>Text</p><button>OK</button></body></html>`),
      );

      const browser = yield* Browser;
      const result = yield* browser.snapshot(page, { interactive: true });

      const roles = Object.values(result.refs).map((entry) => entry.role);
      assert.include(roles, "button");
      assert.notInclude(roles, "heading");
    }).pipe(Effect.provide(Browser.layer)),
  );

  it.effect("snapshot with compact filter removes empty structural nodes", () =>
    Effect.gen(function* () {
      yield* Effect.promise(() =>
        page.setContent(`<html><body><div><div><button>Deep</button></div></div></body></html>`),
      );

      const browser = yield* Browser;
      const full = yield* browser.snapshot(page);
      const compacted = yield* browser.snapshot(page, { compact: true });

      assert.isAtMost(compacted.tree.split("\n").length, full.tree.split("\n").length);
      assert.include(compacted.tree, "button");
    }).pipe(Effect.provide(Browser.layer)),
  );

  it.effect("act performs an action and returns an updated snapshot", () =>
    Effect.gen(function* () {
      yield* Effect.promise(() =>
        page.setContent(
          `<html><body><button onclick="this.textContent='Done'">Click</button></body></html>`,
        ),
      );

      const browser = yield* Browser;
      const before = yield* browser.snapshot(page);
      const buttonRef = Object.keys(before.refs).find((key) => before.refs[key].name === "Click");
      assert.isDefined(buttonRef);

      const after = yield* browser.act(page, buttonRef!, (locator) => locator.click());
      assert.include(after.tree, "Done");
    }).pipe(Effect.provide(Browser.layer)),
  );

  it.effect("act with duplicate-named elements clicks the correct one via nth", () =>
    Effect.gen(function* () {
      yield* Effect.promise(() =>
        page.setContent(
          `<html><body><button onclick="document.title='first'">Go</button><button onclick="document.title='second'">Go</button></body></html>`,
        ),
      );

      const browser = yield* Browser;
      const before = yield* browser.snapshot(page);
      const goButtons = Object.entries(before.refs).filter(
        ([, entry]) => entry.role === "button" && entry.name === "Go",
      );
      assert.strictEqual(goButtons.length, 2);

      yield* browser.act(page, goButtons[1][0], (locator) => locator.click());
      const title = yield* Effect.promise(() => page.title());
      assert.strictEqual(title, "second");
    }).pipe(Effect.provide(Browser.layer)),
  );

  it.effect("locator resolves a ref to a working Playwright locator", () =>
    Effect.gen(function* () {
      yield* Effect.promise(() =>
        page.setContent(`<html><body><button>Target</button></body></html>`),
      );

      const browser = yield* Browser;
      const result = yield* browser.snapshot(page);
      const ref = Object.keys(result.refs).find((key) => result.refs[key].name === "Target");
      assert.isDefined(ref);

      const locator = yield* result.locator(ref!);
      const text = yield* Effect.promise(() => locator.textContent());
      assert.strictEqual(text, "Target");
    }).pipe(Effect.provide(Browser.layer)),
  );

  it.effect("locator fails with RefNotFoundError for unknown refs", () =>
    Effect.gen(function* () {
      yield* Effect.promise(() => page.setContent(`<html><body><button>OK</button></body></html>`));

      const browser = yield* Browser;
      const result = yield* browser.snapshot(page);

      const exit = yield* result.locator("nonexistent").pipe(Effect.exit);
      assert.isTrue(exit._tag === "Failure");
    }).pipe(Effect.provide(Browser.layer)),
  );

  it("diffSnapshots detects additions and removals", () => {
    const before = '- button "Submit" [ref=e1]\n- link "Home" [ref=e2]';
    const after = '- button "Submit" [ref=e1]\n- link "About" [ref=e2]';
    const result = diffSnapshots(before, after);

    assert.isTrue(result.changed);
    assert.isAbove(result.additions, 0);
    assert.isAbove(result.removals, 0);
    assert.strictEqual(result.unchanged, 1);
  });

  it("diffSnapshots reports no changes for identical snapshots", () => {
    const tree = '- button "Submit" [ref=e1]';
    const result = diffSnapshots(tree, tree);

    assert.isFalse(result.changed);
    assert.strictEqual(result.additions, 0);
    assert.strictEqual(result.removals, 0);
  });

  it.effect("snapshot produces consistent refs for the same content", () =>
    Effect.gen(function* () {
      yield* Effect.promise(() =>
        page.setContent(`<html><body><button>A</button><button>B</button></body></html>`),
      );

      const browser = yield* Browser;
      const first = yield* browser.snapshot(page);
      const second = yield* browser.snapshot(page);

      assert.deepStrictEqual(first.refs, second.refs);
    }).pipe(Effect.provide(Browser.layer)),
  );

  it.effect("waitForNavigationSettle completes without error", () =>
    Effect.gen(function* () {
      yield* Effect.promise(() => page.setContent(`<html><body><p>Static</p></body></html>`));

      const browser = yield* Browser;
      const urlBefore = page.url();
      yield* browser.waitForNavigationSettle(page, urlBefore);
    }).pipe(Effect.provide(Browser.layer)),
  );

  it.effect(
    "cleanup browser",
    () =>
      Effect.gen(function* () {
        yield* Effect.promise(() => playwrightBrowser.close());
      }),
    { timeout: 10_000 },
  );
});
