import type { Page } from "playwright";
import { Effect } from "effect";

// HACK: page.evaluate erases types across the serialization boundary; casts are confined here
export const evaluateRuntime = <K extends keyof BrowserTesterRuntime>(
  page: Page,
  method: K,
  ...args: Parameters<BrowserTesterRuntime[K]>
): Effect.Effect<ReturnType<BrowserTesterRuntime[K]>> =>
  Effect.promise(
    () =>
      page.evaluate(
        ({ method, args }: { method: string; args: unknown[] }) => {
          const fn = __browserTesterRuntime[method as keyof BrowserTesterRuntime];
          return (fn as (...params: unknown[]) => unknown)(...args);
        },
        { method, args: args as unknown[] },
      ) as Promise<ReturnType<BrowserTesterRuntime[K]>>,
  );
