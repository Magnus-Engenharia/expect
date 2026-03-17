import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  ensureSafeCurrentWorkingDirectory,
  resolveSafeCurrentWorkingDirectory,
} from "../src/get-safe-current-working-directory";

describe("safe current working directory", () => {
  let safeDirectory: string | undefined;

  afterEach(() => {
    vi.restoreAllMocks();
    if (safeDirectory) {
      rmSync(safeDirectory, { recursive: true, force: true });
      safeDirectory = undefined;
    }
  });

  it("uses the preferred directory when process.cwd throws", () => {
    safeDirectory = mkdtempSync(path.join(tmpdir(), "safe-cwd-"));
    vi.spyOn(process, "cwd").mockImplementation(() => {
      throw new Error("uv_cwd");
    });

    expect(resolveSafeCurrentWorkingDirectory(safeDirectory)).toBe(safeDirectory);
  });

  it("changes into the resolved directory when the current directory is unavailable", () => {
    safeDirectory = mkdtempSync(path.join(tmpdir(), "safe-cwd-"));
    vi.spyOn(process, "cwd").mockImplementation(() => {
      throw new Error("uv_cwd");
    });
    const changeDirectory = vi.spyOn(process, "chdir").mockImplementation(() => undefined);

    expect(ensureSafeCurrentWorkingDirectory(safeDirectory)).toBe(safeDirectory);
    expect(changeDirectory).toHaveBeenCalledWith(safeDirectory);
  });
});
