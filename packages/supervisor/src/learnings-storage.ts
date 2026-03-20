import * as fsPromises from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { LEARNINGS_DIRECTORY_NAME, TESTIE_STATE_DIR } from "./constants";
import { getTestieProjectPathSegments } from "./utils/get-testie-project-path-segments";

const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && "code" in error;

export const getLearningsFilePath = (cwd: string = process.cwd()): string => {
  const pathSegments = getTestieProjectPathSegments(cwd);
  const parentSegments = pathSegments.slice(0, -1);
  const fileName = `${pathSegments[pathSegments.length - 1]}.md`;

  return path.join(
    os.homedir(),
    TESTIE_STATE_DIR,
    LEARNINGS_DIRECTORY_NAME,
    ...parentSegments,
    fileName,
  );
};

export const loadLearnings = async (cwd: string = process.cwd()): Promise<string | undefined> => {
  try {
    return await fsPromises.readFile(getLearningsFilePath(cwd), "utf-8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
};

export const saveLearnings = async (
  content: string,
  cwd: string = process.cwd(),
): Promise<void> => {
  const learningsFilePath = getLearningsFilePath(cwd);
  await fsPromises.mkdir(path.dirname(learningsFilePath), { recursive: true });
  await fsPromises.writeFile(learningsFilePath, `${content.trim()}\n`, "utf-8");
};
