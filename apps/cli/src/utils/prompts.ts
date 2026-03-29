import basePrompts, { type PromptObject, type Answers } from "prompts";
import { logger } from "./logger";

const defaultOnCancel = () => {
  logger.break();
  logger.log("Cancelled.");
  logger.break();
  process.exit(0);
};

let cancelHandler: () => void = defaultOnCancel;

export const setOnCancel = (handler: () => void) => {
  cancelHandler = handler;
};

export const prompts = <T extends string = string>(
  questions: PromptObject<T> | PromptObject<T>[],
): Promise<Answers<T>> => {
  return basePrompts(questions, { onCancel: () => cancelHandler() });
};
