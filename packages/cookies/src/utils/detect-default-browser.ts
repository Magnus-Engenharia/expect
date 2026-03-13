import { homedir, platform } from "node:os";
import path from "node:path";
import { execCommand, isRecord } from "@browser-tester/utils";
import type { Browser } from "../types.js";

const BUNDLE_ID_TO_BROWSER: Record<string, Browser> = {
  "com.google.chrome": "chrome",
  "com.brave.browser": "brave",
  "com.microsoft.edgemac": "edge",
  "org.chromium.chromium": "chromium",
  "com.vivaldi.vivaldi": "vivaldi",
  "com.operasoftware.opera": "opera",
  "company.thebrowser.browser": "arc",
  "com.apple.safari": "safari",
  "org.mozilla.firefox": "firefox",
  "com.nickvision.ghost": "ghost",
  "pushplaylabs.sidekick": "sidekick",
  "ru.yandex.desktop.yandex-browser": "yandex",
  "de.nickvision.iridium": "iridium",
  "nickvision.thorium": "thorium",
  "com.nickvision.sigmaos": "sigmaos",
  "io.wavebox.wavebox": "wavebox",
  "com.nickvision.comet": "comet",
  "com.nickvision.blisk": "blisk",
  "net.imput.helium": "helium",
  "company.thebrowser.dia": "dia",
};

const DESKTOP_FILE_TO_BROWSER: Record<string, Browser> = {
  "google-chrome": "chrome",
  "brave-browser": "brave",
  "microsoft-edge": "edge",
  chromium: "chromium",
  "chromium-browser": "chromium",
  vivaldi: "vivaldi",
  "vivaldi-stable": "vivaldi",
  opera: "opera",
  "opera-stable": "opera",
  firefox: "firefox",
  arc: "arc",
  "ghost-browser": "ghost",
  sidekick: "sidekick",
  "yandex-browser": "yandex",
  iridium: "iridium",
  thorium: "thorium",
  sigmaos: "sigmaos",
  wavebox: "wavebox",
  comet: "comet",
  blisk: "blisk",
  helium: "helium",
  dia: "dia",
};

const PROG_ID_PREFIX_TO_BROWSER: Record<string, Browser> = {
  ChromeHTML: "chrome",
  BraveHTML: "brave",
  MSEdgeHTM: "edge",
  ChromiumHTM: "chromium",
  VivaldiHTM: "vivaldi",
  OperaStable: "opera",
  FirefoxURL: "firefox",
  FirefoxHTML: "firefox",
  ArcHTM: "arc",
};

const detectDarwin = (): Browser | null => {
  const plistPath = path.join(
    homedir(),
    "Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist"
  );
  const output = execCommand(`plutil -convert json -o - "${plistPath}"`);
  if (!output) return null;

  try {
    const parsed: unknown = JSON.parse(output);
    if (!isRecord(parsed)) return null;

    const handlers = parsed["LSHandlers"];
    if (!Array.isArray(handlers)) return null;

    for (const handler of handlers) {
      if (!isRecord(handler)) continue;
      const scheme = handler["LSHandlerURLScheme"];
      if (typeof scheme !== "string" || scheme.toLowerCase() !== "https")
        continue;

      const bundleId = handler["LSHandlerRoleAll"];
      if (typeof bundleId !== "string") continue;

      return BUNDLE_ID_TO_BROWSER[bundleId.toLowerCase()] ?? null;
    }
  } catch {
    return null;
  }

  return null;
};

const detectLinux = (): Browser | null => {
  const output = execCommand("xdg-settings get default-web-browser");
  if (!output) return null;

  const desktopName = output.replace(/\.desktop$/i, "").toLowerCase();
  return DESKTOP_FILE_TO_BROWSER[desktopName] ?? null;
};

const detectWindows = (): Browser | null => {
  const registryPath =
    "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice";
  const output = execCommand(`reg query "${registryPath}" /v ProgId`);
  if (!output) return null;

  const match = output.match(/ProgId\s+REG_SZ\s+(\S+)/);
  if (!match?.[1]) return null;

  const progId = match[1];
  for (const [prefix, browser] of Object.entries(PROG_ID_PREFIX_TO_BROWSER)) {
    if (progId.startsWith(prefix)) return browser;
  }

  return null;
};

export const detectDefaultBrowser = (): Browser | null => {
  const currentPlatform = platform();
  switch (currentPlatform) {
    case "darwin":
      return detectDarwin();
    case "linux":
      return detectLinux();
    case "win32":
      return detectWindows();
    default:
      return null;
  }
};
