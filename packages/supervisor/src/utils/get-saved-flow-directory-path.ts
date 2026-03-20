import * as os from "node:os";
import * as path from "node:path";
import { FLOW_DIRECTORY_NAME, TESTIE_STATE_DIR } from "../constants";
import { getTestieProjectPathSegments } from "./get-testie-project-path-segments";

export const getSavedFlowDirectoryPath = (cwd: string = process.cwd()): string =>
  path.join(
    os.homedir(),
    TESTIE_STATE_DIR,
    FLOW_DIRECTORY_NAME,
    ...getTestieProjectPathSegments(cwd),
  );
