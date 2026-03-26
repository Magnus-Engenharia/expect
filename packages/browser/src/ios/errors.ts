import { Schema } from "effect";

export class SimulatorNotFoundError extends Schema.ErrorClass<SimulatorNotFoundError>(
  "SimulatorNotFoundError",
)({
  _tag: Schema.tag("SimulatorNotFoundError"),
  device: Schema.String,
}) {
  message = `iOS simulator not found: ${this.device}`;
}

export class SimulatorBootError extends Schema.ErrorClass<SimulatorBootError>("SimulatorBootError")(
  {
    _tag: Schema.tag("SimulatorBootError"),
    udid: Schema.String,
    cause: Schema.String,
  },
) {
  message = `Failed to boot simulator ${this.udid}: ${this.cause}`;
}

export class XcodeNotInstalledError extends Schema.ErrorClass<XcodeNotInstalledError>(
  "XcodeNotInstalledError",
)({
  _tag: Schema.tag("XcodeNotInstalledError"),
  cause: Schema.String,
}) {
  message = `Xcode not installed or xcrun simctl unavailable: ${this.cause}`;
}

export class AppiumLaunchError extends Schema.ErrorClass<AppiumLaunchError>("AppiumLaunchError")({
  _tag: Schema.tag("AppiumLaunchError"),
  cause: Schema.String,
}) {
  message = `Appium launch failed: ${this.cause}`;
}

export class WebDriverRequestError extends Schema.ErrorClass<WebDriverRequestError>(
  "WebDriverRequestError",
)({
  _tag: Schema.tag("WebDriverRequestError"),
  method: Schema.String,
  path: Schema.String,
  cause: Schema.String,
}) {
  message = `WebDriver ${this.method} ${this.path} failed: ${this.cause}`;
}
