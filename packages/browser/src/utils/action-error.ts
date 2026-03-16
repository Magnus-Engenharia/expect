import {
  ActionTimeoutError,
  RefAmbiguousError,
  RefBlockedError,
  RefNotVisibleError,
} from "../errors";
import type { ActionError } from "../errors";

const ELEMENT_COUNT_REGEX = /resolved to (\d+) elements/;

export const toActionError = (error: unknown, ref: string): ActionError => {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (errorMessage.includes("strict mode violation")) {
    const countMatch = ELEMENT_COUNT_REGEX.exec(errorMessage);
    return new RefAmbiguousError({ matchCount: countMatch ? countMatch[1] : "multiple", ref });
  }

  if (errorMessage.includes("intercepts pointer events")) {
    return new RefBlockedError({ ref });
  }

  if (errorMessage.includes("not visible") && !errorMessage.includes("Timeout")) {
    return new RefNotVisibleError({ ref });
  }

  if (errorMessage.includes("Timeout") && errorMessage.includes("exceeded")) {
    return new ActionTimeoutError({ ref });
  }

  if (errorMessage.includes("waiting for") && errorMessage.includes("to be visible")) {
    return new RefNotVisibleError({ ref });
  }

  return new ActionTimeoutError({ ref });
};
