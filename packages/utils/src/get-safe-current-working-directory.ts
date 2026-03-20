import * as fs from "node:fs";
import * as os from "node:os";

const isAccessibleDirectory = (directory: string | undefined): directory is string => {
  if (!directory) return false;

  try {
    fs.accessSync(directory, fs.constants.R_OK | fs.constants.X_OK);
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
    os.homedir(),
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
