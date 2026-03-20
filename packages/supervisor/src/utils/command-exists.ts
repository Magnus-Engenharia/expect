import * as child_process from "node:child_process";

export const commandExists = (command: string): Promise<boolean> =>
  new Promise((resolve) => {
    child_process.execFile("which", [command], { encoding: "utf-8" }, (error) => {
      resolve(!error);
    });
  });
