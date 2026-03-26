import { spawn } from "node:child_process";
import { Effect, Schedule } from "effect";
import { createWebDriverClient } from "./webdriver-client";
import { AppiumLaunchError } from "./errors";
import {
  APPIUM_DEFAULT_PORT,
  APPIUM_HEALTH_CHECK_INTERVAL_MS,
  APPIUM_STARTUP_TIMEOUT_MS,
  TAP_PAUSE_DURATION_MS,
} from "./constants";

const isAppiumRunning = Effect.fn("Appium.isAppiumRunning")(function* (port: number) {
  return yield* Effect.promise(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2_000);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/status`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return response.ok;
    } catch {
      clearTimeout(timeout);
      return false;
    }
  });
});

const acquireAppiumProcess = Effect.fn("Appium.acquireProcess")(function* (port: number) {
  const alreadyRunning = yield* isAppiumRunning(port);
  if (alreadyRunning) {
    yield* Effect.logInfo("Appium already running", { port });
    return undefined;
  }

  const appiumArgs = ["--relaxed-security", "--port", String(port)];

  const trySpawn = (command: string, args: string[]) => {
    try {
      return spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch {
      return undefined;
    }
  };

  const process = trySpawn("npx", ["appium", ...appiumArgs]) ?? trySpawn("appium", appiumArgs);

  if (!process) {
    return yield* new AppiumLaunchError({
      cause:
        "Appium not found. Install with: npm install -g appium && appium driver install xcuitest",
    });
  }

  yield* Effect.logInfo("Appium server launching", { port });

  const maxAttempts = Math.ceil(APPIUM_STARTUP_TIMEOUT_MS / APPIUM_HEALTH_CHECK_INTERVAL_MS);
  yield* isAppiumRunning(port).pipe(
    Effect.flatMap((running) => {
      if (running) return Effect.succeed(true);
      return Effect.fail(new AppiumLaunchError({ cause: "Appium not ready yet" }));
    }),
    Effect.retry({
      times: maxAttempts,
      schedule: Schedule.spaced(APPIUM_HEALTH_CHECK_INTERVAL_MS),
    }),
  );

  yield* Effect.logInfo("Appium server ready", { port });
  return process;
});

const buildIosCapabilities = (
  deviceUdid?: string,
  deviceName?: string,
  platformVersion?: string,
): Record<string, unknown> => {
  const capabilities: Record<string, unknown> = {
    platformName: "iOS",
    "appium:automationName": "XCUITest",
    browserName: "Safari",
    "appium:noReset": true,
    "appium:deviceName": deviceName ?? "iPhone",
  };
  if (platformVersion) capabilities["appium:platformVersion"] = platformVersion;
  if (deviceUdid) capabilities["appium:udid"] = deviceUdid;
  return capabilities;
};

const touchAction = (
  points: Array<{ type: string; duration?: number; x?: number; y?: number; button?: number }>,
) => ({
  actions: [
    {
      type: "pointer",
      id: "finger1",
      parameters: { pointerType: "touch" },
      actions: points,
    },
  ],
});

export const createIosSession = Effect.fn("Appium.createIosSession")(function* (
  deviceUdid?: string,
  deviceName?: string,
  platformVersion?: string,
) {
  const port = APPIUM_DEFAULT_PORT;

  yield* Effect.acquireRelease(acquireAppiumProcess(port), (process) => {
    if (process) {
      process.kill();
    }
    return Effect.void;
  });

  const client = yield* createWebDriverClient(port);

  const capabilities = buildIosCapabilities(deviceUdid, deviceName, platformVersion);
  yield* client
    .createSession(capabilities)
    .pipe(
      Effect.catchTag("WebDriverRequestError", (error) =>
        new AppiumLaunchError({ cause: error.message }).asEffect(),
      ),
    );

  yield* Effect.addFinalizer(() => client.deleteSession());

  yield* Effect.logInfo("Appium iOS session created", { deviceName, deviceUdid });

  const tap = Effect.fn("Appium.tap")(function* (x: number, y: number) {
    yield* client.executeActions(
      touchAction([
        { type: "pointerMove", duration: 0, x: Math.round(x), y: Math.round(y) },
        { type: "pointerDown", button: 0 },
        { type: "pause", duration: TAP_PAUSE_DURATION_MS },
        { type: "pointerUp", button: 0 },
      ]),
    );
  });

  const swipe = Effect.fn("Appium.swipe")(function* (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    durationMs: number,
  ) {
    yield* client.executeActions(
      touchAction([
        { type: "pointerMove", duration: 0, x: Math.round(startX), y: Math.round(startY) },
        { type: "pointerDown", button: 0 },
        { type: "pointerMove", duration: durationMs, x: Math.round(endX), y: Math.round(endY) },
        { type: "pointerUp", button: 0 },
      ]),
    );
  });

  return { client, tap, swipe } as const;
});
