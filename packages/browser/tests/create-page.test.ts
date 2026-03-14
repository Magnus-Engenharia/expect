import type { BrowserProfile, Cookie } from "@browser-tester/cookies";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  detectBrowserProfilesMock,
  detectDefaultBrowserMock,
  extractAllProfileCookiesMock,
  extractCookiesMock,
  injectCookiesMock,
  launchMock,
  newContextMock,
  newPageMock,
  gotoMock,
  closeMock,
} = vi.hoisted(() => ({
  detectBrowserProfilesMock: vi.fn(),
  detectDefaultBrowserMock: vi.fn(),
  extractAllProfileCookiesMock: vi.fn(),
  extractCookiesMock: vi.fn(),
  injectCookiesMock: vi.fn(),
  launchMock: vi.fn(),
  newContextMock: vi.fn(),
  newPageMock: vi.fn(),
  gotoMock: vi.fn(),
  closeMock: vi.fn(),
}));

vi.mock("@browser-tester/cookies", () => ({
  detectBrowserProfiles: detectBrowserProfilesMock,
  detectDefaultBrowser: detectDefaultBrowserMock,
  extractAllProfileCookies: extractAllProfileCookiesMock,
  extractCookies: extractCookiesMock,
}));

vi.mock("playwright", () => ({
  chromium: {
    launch: launchMock,
  },
}));

vi.mock("../src/inject-cookies", () => ({
  injectCookies: injectCookiesMock,
}));

import { createPage } from "../src/create-page";

const heliumProfile: BrowserProfile = {
  profileName: "Default",
  profilePath: "/tmp/helium/Default",
  displayName: "You",
  browser: {
    name: "Helium",
    executablePath: "/Applications/Helium.app/Contents/MacOS/Helium",
  },
};

const profileCookies: Cookie[] = [
  {
    name: "__Host-session",
    value: "profile-cookie",
    domain: "github.com",
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "Strict",
    browser: "helium",
  },
];

const fallbackCookies: Cookie[] = [
  {
    name: "fallback-session",
    value: "sqlite-cookie",
    domain: "github.com",
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
    browser: "helium",
  },
];

describe("createPage cookie reuse", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    gotoMock.mockResolvedValue(undefined);
    newPageMock.mockResolvedValue({ goto: gotoMock });
    newContextMock.mockResolvedValue({ newPage: newPageMock });
    closeMock.mockResolvedValue(undefined);
    launchMock.mockResolvedValue({
      newContext: newContextMock,
      close: closeMock,
    });

    detectDefaultBrowserMock.mockResolvedValue("helium");
    detectBrowserProfilesMock.mockReturnValue([heliumProfile]);
    extractAllProfileCookiesMock.mockResolvedValue({
      cookies: profileCookies,
      warnings: [],
    });
    extractCookiesMock.mockResolvedValue({
      cookies: fallbackCookies,
      warnings: [],
    });
    injectCookiesMock.mockResolvedValue(undefined);
  });

  it("uses profile cookies before sqlite fallback for the default browser", async () => {
    await createPage("https://github.com", { cookies: true });

    expect(detectDefaultBrowserMock).toHaveBeenCalledOnce();
    expect(detectBrowserProfilesMock).toHaveBeenCalledWith({ browser: "helium" });
    expect(extractAllProfileCookiesMock).toHaveBeenCalledWith([heliumProfile]);
    expect(extractCookiesMock).not.toHaveBeenCalled();
    expect(injectCookiesMock).toHaveBeenCalledWith(expect.anything(), profileCookies);
  });

  it("falls back to sqlite extraction when profile extraction returns no cookies", async () => {
    extractAllProfileCookiesMock.mockResolvedValueOnce({
      cookies: [],
      warnings: ["no cookies found in profile: You"],
    });

    await createPage("https://github.com", { cookies: true });

    expect(extractCookiesMock).toHaveBeenCalledWith({
      url: "https://github.com",
      browsers: ["helium"],
    });
    expect(injectCookiesMock).toHaveBeenCalledWith(expect.anything(), fallbackCookies);
  });
});
