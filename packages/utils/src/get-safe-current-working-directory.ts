import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";

const isAccessibleDirectory = (directory: string | undefined): directory is string => {
  if (!directory) return false;

  try {
    accessSync(directory, constants.R_OK | constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

const getProcessWorkingDirectory = (): string | undefined => {
  try {
    return process.cwd();
  } catch {
    return undefined;
  }
};

export const resolveSafeCurrentWorkingDirectory = (preferredDirectory?: string): string => {
  const candidates = [
    preferredDirectory,
    getProcessWorkingDirectory(),
    process.env.PWD,
    homedir(),
    "/",
  ];

  for (const directory of candidates) {
    if (isAccessibleDirectory(directory)) return directory;
  }

  throw new Error("Unable to resolve an accessible working directory.");
};

export const ensureSafeCurrentWorkingDirectory = (preferredDirectory?: string): string => {
  const safeWorkingDirectory = resolveSafeCurrentWorkingDirectory(preferredDirectory);
  const currentWorkingDirectory = getProcessWorkingDirectory();

  if (currentWorkingDirectory !== safeWorkingDirectory) {
    process.chdir(safeWorkingDirectory);
  }

  return safeWorkingDirectory;
};
